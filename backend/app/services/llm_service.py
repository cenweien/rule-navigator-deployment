"""
LLM service using Google Gemini for AI-powered responses.
"""
import google.generativeai as genai
import os
from typing import Optional

from app.models.schemas import Citation


class LLMService:
    """Service for generating AI responses using Google Gemini."""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Gemini API.

        Args:
            api_key: Google API key. If not provided, reads from GOOGLE_API_KEY env var.
        """
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Google API key required. Set GOOGLE_API_KEY environment variable "
                "or pass api_key parameter."
            )

        genai.configure(api_key=self.api_key)

        # Use Gemini Flash Lite (latest) for fast, cost-effective responses
        self.model = genai.GenerativeModel(
            model_name="gemini-flash-lite-latest",
            generation_config={
                "temperature": 0.3,  # Lower for more factual responses
                "top_p": 0.8,
                "top_k": 40,
                "max_output_tokens": 2048,
            },
            safety_settings=[
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            ]
        )

        self.system_prompt = """You are an expert assistant for CME Group trading rules and regulations.
Your role is to help traders, compliance officers, and financial professionals navigate the CME rulebook.

Guidelines:
1. Always base your answers on the provided context from CME documents.
2. Be precise and cite specific rules when possible.
3. If the context doesn't contain enough information, acknowledge this clearly.
4. Use clear, professional language suitable for financial industry professionals.
5. When explaining rules, break down complex concepts into understandable parts.
6. Highlight important warnings, deadlines, or requirements that traders must know.

When referencing rules:
- Always mention the specific rule number and section when available
- Quote directly from the source when it adds clarity
- Explain the practical implications of rules for traders

Format your responses with:
- Clear section headers when covering multiple topics
- Bullet points for lists of requirements or conditions
- Bold text for critical information or warnings
"""

    def generate_response(
        self,
        query: str,
        citations: list[Citation],
        conversation_history: Optional[list[dict]] = None
    ) -> str:
        """
        Generate an AI response based on query and retrieved context.

        Args:
            query: User's question
            citations: Retrieved document citations with context
            conversation_history: Optional previous messages for context

        Returns:
            Generated response text
        """
        # Build context from citations
        context_parts = []
        for i, citation in enumerate(citations, 1):
            context_parts.append(
                f"[Source {i}: {citation.document_title}, Page {citation.page_number}]\n"
                f"{citation.excerpt}\n"
            )

        context = "\n".join(context_parts) if context_parts else "No relevant documents found."

        # Build the prompt
        prompt = f"""{self.system_prompt}

CONTEXT FROM CME DOCUMENTS:
{context}

USER QUESTION:
{query}

Please provide a helpful, accurate response based on the CME rulebook context above.
If you reference information from the context, indicate which source it comes from (e.g., "According to Source 1...").
If the context doesn't fully answer the question, acknowledge this and provide what information you can."""

        # Include conversation history if provided
        messages = []
        if conversation_history:
            for msg in conversation_history[-6:]:  # Last 6 messages for context
                role = "user" if msg.get("role") == "user" else "model"
                messages.append({"role": role, "parts": [msg.get("content", "")]})

        # Add current query
        messages.append({"role": "user", "parts": [prompt]})

        try:
            # Generate response
            if len(messages) == 1:
                response = self.model.generate_content(prompt)
            else:
                chat = self.model.start_chat(history=messages[:-1])
                response = chat.send_message(prompt)

            return response.text

        except Exception as e:
            error_msg = str(e)
            if "quota" in error_msg.lower():
                return "I apologize, but the API rate limit has been reached. Please try again in a moment."
            elif "location" in error_msg.lower() or "400" in error_msg:
                return (
                    "API Error: User location is not supported. "
                    "This service uses Google Gemini, which may be restricted in your current region (e.g., Hong Kong, Europe). "
                    "Solution: Deploy this backend to a supported region (US/Singapore) or use a VPN/Proxy for local development."
                )
            elif "api_key" in error_msg.lower():
                return "There's an issue with the API configuration. Please check the API key setup."
            else:
                return f"I encountered an error generating the response. Please try rephrasing your question. Error: {error_msg}"

    def generate_summary(self, text: str, max_length: int = 200) -> str:
        """
        Generate a summary of the given text.

        Args:
            text: Text to summarize
            max_length: Maximum length of summary

        Returns:
            Summarized text
        """
        prompt = f"""Summarize the following CME rulebook text in {max_length} characters or less.
Focus on the key requirements and obligations:

{text}

Summary:"""

        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception:
            return text[:max_length] + "..." if len(text) > max_length else text

    def extract_key_terms(self, text: str) -> list[str]:
        """
        Extract key trading/regulatory terms from text.

        Args:
            text: Text to analyze

        Returns:
            List of key terms
        """
        prompt = f"""Extract the key CME trading and regulatory terms from this text.
Return only a comma-separated list of terms, no explanations:

{text}

Terms:"""

        try:
            response = self.model.generate_content(prompt)
            terms = [t.strip() for t in response.text.split(",")]
            return terms[:10]  # Limit to 10 terms
        except Exception:
            return []
