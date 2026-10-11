import os
from typing import List, Dict, Any, Optional
from anthropic import Anthropic
from openai import OpenAI

_qa_model = None
_qa_tokenizer = None

def get_qa_model_and_tokenizer():
    global _qa_model, _qa_tokenizer
    if _qa_model is None or _qa_tokenizer is None:
        from transformers import AutoTokenizer, AutoModelForQuestionAnswering
        model_name = "deepset/tinyroberta-squad2"
        print(f"Loading local QA model ('{model_name}')...")
        _qa_tokenizer = AutoTokenizer.from_pretrained(model_name)
        _qa_model = AutoModelForQuestionAnswering.from_pretrained(model_name)
        print("Local QA model loaded successfully.")
    return _qa_model, _qa_tokenizer

def query_local_qa(query: str, chunks: List[Dict[str, Any]]) -> str:
    if not chunks:
        return "I cannot find any relevant sections in the document(s) to answer your query."

    context = "\n\n".join([c["text"] for c in chunks])
    
    try:
        import torch
        model, tokenizer = get_qa_model_and_tokenizer()
        
        # Tokenize with context truncation up to 512 tokens
        inputs = tokenizer(
            query, 
            context, 
            max_length=512, 
            truncation="only_second", 
            return_tensors="pt"
        )
        
        with torch.no_grad():
            outputs = model(**inputs)
            
        start_idx = int(torch.argmax(outputs.start_logits))
        end_idx = int(torch.argmax(outputs.end_logits)) + 1
        
        if end_idx <= start_idx or (end_idx - start_idx) > 60:
            raise ValueError("Extracted answer span invalid.")
            
        answer_tokens = inputs["input_ids"][0][start_idx:end_idx]
        answer = tokenizer.convert_tokens_to_string(tokenizer.convert_ids_to_tokens(answer_tokens)).strip()
        
        # Softmax confidence score
        start_probs = torch.softmax(outputs.start_logits, dim=-1)
        end_probs = torch.softmax(outputs.end_logits, dim=-1)
        score = float(start_probs[0][start_idx] * end_probs[0][end_idx - 1])

        if not answer or answer in ["<s>", "</s>", "<pad>", ""] or score < 0.005:
            raise ValueError("Confidence score is too low.")

        # Capitalize the first letter of the answer
        if len(answer) > 0:
            answer = answer[0].upper() + answer[1:]

        response = (
            f"### 🔍 Extracted Answer\n"
            f"**{answer}** *(Confidence: {score:.1%})*\n\n"
            f"---\n"
            f"### 💡 Offline Mode Details\n"
            f"The local offline QA model extracted this exact text segment from the PDF context. "
            f"To get complete, conversational sentences synthesized across multiple pages, please "
            f"configure **Google Gemini** (free tier) or Claude/GPT in the **Settings** panel."
        )
        return response
    except Exception as e:
        print(f"Local QA model fallback triggered: {e}")
        # Elegant fallback: list the top 3 matching chunks for the user to read directly
        response = (
            f"### 📄 Matching Passages (Offline Fallback)\n"
            f"No confident summary could be generated on CPU, but I found these relevant sections in the document:\n\n"
        )
        for idx, chunk in enumerate(chunks[:3]):
            response += f"**Excerpt {idx+1} (Page {chunk['page']})**:\n"
            response += f"> \"{chunk['text']}\"\n\n"
            
        response += (
            f"---\n"
            f"*Tip: Configure Google Gemini (free tier) or Claude/GPT in the **Settings** panel to enable advanced generative synthesis.*"
        )
        return response

def query_llm(
    query: str, 
    chunks: List[Dict[str, Any]], 
    provider: str, 
    api_key: Optional[str] = None, 
    model: Optional[str] = None
) -> str:
    """
    Sends the user query and retrieved context chunks to the selected LLM provider (Anthropic, OpenAI, or Local).
    """
    # 0. Handle Local Offline Provider
    if provider.lower() == "local":
        return query_local_qa(query, chunks)

    # 1. Resolve API Key (input key first, then environment variable)
    resolved_key = api_key or (
        os.getenv("ANTHROPIC_API_KEY") if provider.lower() == "anthropic" 
        else os.getenv("OPENAI_API_KEY") if provider.lower() == "openai"
        else os.getenv("GEMINI_API_KEY") if provider.lower() == "gemini"
        else None
    )

    if provider.lower() != "ollama" and not resolved_key:
        raise ValueError(
            f"API Key for '{provider}' is missing. Please set the environment variable "
            f"({ 'ANTHROPIC_API_KEY' if provider.lower() == 'anthropic' else 'OPENAI_API_KEY' if provider.lower() == 'openai' else 'GEMINI_API_KEY' }) "
            f"or configure it in the application settings."
        )

    # 2. Build the context string from chunks
    context_str = ""
    for idx, chunk in enumerate(chunks):
        context_str += f"\n--- Context Source #{idx + 1} (File: {chunk['filename']}, Page: {chunk['page']}) ---\n"
        context_str += f"{chunk['text']}\n"
    
    if not context_str.strip():
        context_str = "No relevant context found in the document(s)."

    # 3. Construct System and User Prompts
    system_prompt = (
        "You are an advanced AI document assistant. Your task is to answer the user's question "
        "based strictly on the retrieved document chunks provided in the context.\n\n"
        "Rules:\n"
        "1. Answer the question thoroughly but keep it concise and grounded in the context.\n"
        "2. If the answer cannot be found in the provided context, state clearly: "
        "\"I cannot find the answer in the provided document(s).\" Do NOT attempt to make up or "
        "extrapolate answers from general knowledge.\n"
        "3. Always reference page numbers and filenames when quoting or describing details from "
        "the document (e.g. \"(as stated on page 3 of report.pdf)\" or \"[Page 12]\").\n"
        "4. Use Markdown formatting for headings, lists, bold text, and tables to make your response easy to read."
    )

    user_content = f"Context:\n{context_str}\n\nQuestion: {query}\n\nAnswer:"

    # 4. Call LLM API
    if provider.lower() == "anthropic":
        client = Anthropic(api_key=resolved_key)
        # Default to Claude 3.5 Sonnet
        selected_model = model or "claude-3-5-sonnet-20241022"
        
        response = client.messages.create(
            model=selected_model,
            max_tokens=1024,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_content}
            ]
        )
        return response.content[0].text

    elif provider.lower() == "openai":
        client = OpenAI(api_key=resolved_key)
        # Default to GPT-4o mini (highly cost-effective and capable for RAG)
        selected_model = model or "gpt-4o-mini"
        
        response = client.chat.completions.create(
            model=selected_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            max_tokens=1024,
            temperature=0.3
        )
        return response.choices[0].message.content

    elif provider.lower() == "gemini":
        selected_model = (model or "gemini-2.5-flash").replace("models/", "")
        
        # 1. First priority: Use official google-genai SDK
        try:
            from google import genai
            from google.genai import types
            
            client = genai.Client(api_key=resolved_key)
            models_to_try = [selected_model]
            for fallback_m in ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-pro", "gemini-flash-lite-latest", "gemini-2.0-flash"]:
                if fallback_m not in models_to_try:
                    models_to_try.append(fallback_m)

            for m in models_to_try:
                try:
                    print(f"Attempting Gemini generation via official GenAI SDK with '{m}'...")
                    sdk_resp = client.models.generate_content(
                        model=m,
                        contents=user_content,
                        config=types.GenerateContentConfig(
                            system_instruction=system_prompt,
                            temperature=0.3,
                            max_output_tokens=1024
                        )
                    )
                    if sdk_resp.text:
                        print(f"GenAI SDK successfully generated response using '{m}'")
                        return sdk_resp.text
                except Exception as m_err:
                    print(f"GenAI SDK attempt with '{m}' failed: {m_err}")
                    continue
        except Exception as sdk_init_err:
            print(f"GenAI SDK initialization failed: {sdk_init_err}. Trying REST fallback...")

        # 2. Secondary fallback: Direct REST API
        import urllib.request
        import json
        
        def _execute_gemini_request(model_to_use: str, api_ver: str = "v1beta", include_system_instruction: bool = True) -> tuple[Optional[str], Optional[int], Optional[str]]:
            url = f"https://generativelanguage.googleapis.com/{api_ver}/models/{model_to_use}:generateContent?key={resolved_key}"
            
            contents = [
                {
                    "role": "user",
                    "parts": [{"text": user_content if include_system_instruction else f"{system_prompt}\n\n{user_content}"}]
                }
            ]
            
            payload = {
                "contents": contents,
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 1024
                }
            }
            if include_system_instruction:
                payload["systemInstruction"] = {
                    "parts": [{"text": system_prompt}]
                }

            headers = {
                "Content-Type": "application/json",
                "x-goog-api-key": resolved_key
            }
            try:
                data = json.dumps(payload).encode("utf-8")
                req = urllib.request.Request(url, data=data, headers=headers, method="POST")
                with urllib.request.urlopen(req, timeout=30) as response:
                    res_data = json.loads(response.read().decode("utf-8"))
                    candidates = res_data.get("candidates", [])
                    if candidates:
                        candidate = candidates[0]
                        content = candidate.get("content", {})
                        parts = content.get("parts", [])
                        if parts:
                            return parts[0].get("text", ""), 200, None
                        finish_reason = candidate.get("finishReason")
                        if finish_reason:
                            return f"Gemini response status: {finish_reason}.", 200, None
                    prompt_feedback = res_data.get("promptFeedback", {})
                    if prompt_feedback.get("blockReason"):
                        return f"Gemini blocked the request: {prompt_feedback.get('blockReason')}.", 200, None
                    return "No response text generated from Gemini.", 200, None
            except urllib.error.HTTPError as e:
                error_body = e.read().decode("utf-8")
                try:
                    error_json = json.loads(error_body)
                    error_msg = error_json.get("error", {}).get("message", error_body)
                except Exception:
                    error_msg = error_body
                return None, e.code, error_msg
            except Exception as e:
                return None, 500, str(e)

        # Try REST with requested model and fallbacks
        rest_models = [selected_model, "gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-pro"]
        for rm in rest_models:
            for ver in ["v1beta", "v1"]:
                for inc_sys in [True, False]:
                    ans, code, err = _execute_gemini_request(rm, ver, inc_sys)
                    if code == 200 and ans is not None:
                        return ans

        raise RuntimeError(f"Gemini API request failed for '{selected_model}': {err}")

    elif provider.lower() == "ollama":
        selected_model = model or "llama3"
        ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
        
        try:
            client = OpenAI(
                api_key="ollama",  # dummy key
                base_url=ollama_url
            )
            response = client.chat.completions.create(
                model=selected_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                max_tokens=1024,
                temperature=0.3
            )
            return response.choices[0].message.content or "No response generated from Ollama."
        except Exception as e:
            raise RuntimeError(
                f"Failed to connect to local Ollama service at {ollama_url}: {str(e)}. "
                f"Please ensure Ollama is running and that the model "
                f"'{selected_model}' has been downloaded (e.g., run 'ollama run {selected_model}' in your terminal)."
            )

    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")
