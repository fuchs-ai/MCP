# Beispiel 1: Verwendung der Pipeline
from transformers import pipeline

# Pipeline-Ansatz (einfacher zu verwenden)
def use_pipeline():
    print("=== Pipeline-Ansatz ===")
    messages = [
        {"role": "user", "content": "Who are you?"},
    ]
    pipe = pipeline("text-generation", model="unsloth/DeepSeek-R1-Distill-Llama-8B")
    
    # Konfiguration für die Textgenerierung hinzufügen
    result = pipe(messages, max_length=100, do_sample=True, temperature=0.7)
    
    # Ausgabe des Ergebnisses
    print("Ergebnis:")
    print(result[0]['generated_text'])
    print("\n")


# Beispiel 2: Direktes Laden und Verwenden des Modells
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

def use_direct_model():
    print("=== Direkter Modell-Ansatz ===")
    
    # Modell und Tokenizer laden
    tokenizer = AutoTokenizer.from_pretrained("unsloth/DeepSeek-R1-Distill-Llama-8B")
    model = AutoModelForCausalLM.from_pretrained("unsloth/DeepSeek-R1-Distill-Llama-8B")
    
    # Eingabenachricht formatieren
    prompt = "Who are you?"
    inputs = tokenizer(prompt, return_tensors="pt")
    
    # Text generieren
    with torch.no_grad():
        output = model.generate(
            inputs["input_ids"],
            max_length=100,
            do_sample=True,
            temperature=0.7,
            pad_token_id=tokenizer.eos_token_id
        )
    
    # Generierte Antwort decodieren und ausgeben
    generated_text = tokenizer.decode(output[0], skip_special_tokens=True)
    print("Eingabe:", prompt)
    print("Generierte Antwort:", generated_text)

# Beide Ansätze ausführen
if __name__ == "__main__":
    print("LLM-Beispiel mit DeepSeek-R1-Distill-Llama-8B\n")
    
    # Wählen Sie einen der Ansätze oder kommentieren Sie einen aus
    try:
        use_pipeline()
    except Exception as e:
        print(f"Fehler beim Pipeline-Ansatz: {e}")
    
    try:
        use_direct_model()
    except Exception as e:
        print(f"Fehler beim direkten Modell-Ansatz: {e}") 