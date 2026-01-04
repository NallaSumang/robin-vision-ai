from google import genai

# PASTE YOUR KEY HERE 👇
client = genai.Client(api_key="AIzaSyArPcnAZEMRRZ_15NsJ9bGqXh1yp0b4xDo")

print("🔍 Checking available models for your key...")

try:
    # Ask Google for the list
    for model in client.models.list():
        # We only want models that can "generateContent" (Chat)
        if "generateContent" in model.supported_actions:
            print(f"✅ Found: {model.name}")

except Exception as e:
    print(f"❌ Error: {e}")
