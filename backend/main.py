import json
import os
import base64
import io
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types
from PIL import Image
from dotenv import load_dotenv

# --- 1. SETUP & SECURITY ---
current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, ".env")
load_dotenv(env_path)

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise ValueError("❌ No API Key found! Check your .env file.")

client = genai.Client(api_key=API_KEY)
app = FastAPI()

# --- MODEL SELECTOR (CHANGE THIS IF IT FAILS) ---
# OPTION 1: Standard Flash (Try this first)
MODEL_NAME = "gemini-2.0-flash"

# OPTION 2: The Pro Model (Smarter, but slower)
# MODEL_NAME = "gemini-2.5-pro"

# OPTION 3: The 8B Model (Fastest)
# MODEL_NAME = "gemini-2.5-flash-8b"
# ------------------------------------------------

# --- 2. FILE SYSTEM (HISTORY) ---
HISTORY_FILE = "chat_history.json"
local_chat_history = []


def load_history_from_file():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r") as f:
                data = json.load(f)
                cleaned_data = []
                for msg in data:
                    if "parts" in msg:
                        new_parts = []
                        for part in msg["parts"]:
                            if isinstance(part, str):
                                new_parts.append({"text": part})
                            elif isinstance(part, dict) and "text" in part:
                                new_parts.append(part)
                        msg["parts"] = new_parts
                    cleaned_data.append(msg)
                return cleaned_data
        except Exception:
            pass
    return []


def save_history_to_file():
    try:
        with open(HISTORY_FILE, "w") as f:
            json.dump(local_chat_history, f, indent=2)
    except Exception:
        pass


# --- 3. INITIALIZE BRAIN ---
local_chat_history = load_history_from_file()

sys_instruct = "You are a helpful AI assistant. You can see images."

# Uses the MODEL_NAME variable defined above
chat_session = client.chats.create(
    model=MODEL_NAME,
    config=types.GenerateContentConfig(
        system_instruction=sys_instruct,
        temperature=0.7
    ),
    history=local_chat_history
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    image: str | None = None


@app.get("/history")
def get_history():
    return load_history_from_file()


@app.post("/chat")
def chat_endpoint(request: ChatRequest):
    try:
        user_parts = [{"text": request.message}]

        if request.image:
            print(f"🖼️ Processing image with model: {MODEL_NAME}")
            if "," in request.image:
                base64_data = request.image.split(",")[1]
            else:
                base64_data = request.image

            image_bytes = base64.b64decode(base64_data)
            img = Image.open(io.BytesIO(image_bytes))

            response = chat_session.send_message([request.message, img])
            user_parts.append({"text": "[User uploaded an image]"})

        else:
            response = chat_session.send_message(request.message)

        ai_text = response.text

        local_chat_history.append({"role": "user", "parts": user_parts})
        local_chat_history.append(
            {"role": "model", "parts": [{"text": ai_text}]})
        save_history_to_file()

        return {"reply": ai_text}

    except Exception as e:
        print(f"❌ Error: {e}")
        return {"reply": f"Error with {MODEL_NAME}: {str(e)}"}
