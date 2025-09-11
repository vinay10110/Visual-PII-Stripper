from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline

# Load tokenizer and model
tokenizer = AutoTokenizer.from_pretrained("ai4bharat/IndicNER")
model = AutoModelForTokenClassification.from_pretrained("ai4bharat/IndicNER")

# Create a NER pipeline with aggregation
ner_pipeline = pipeline("ner", model=model, tokenizer=tokenizer, aggregation_strategy="simple")

def extract_indian_names(ocr_data):
    names = []

    for item in ocr_data:
        text = item.get("text", "")
        box = item.get("box", [])
        page = item.get("page", 1)
        conf = item.get("confidence", 1.0)
        
        # Skip empty text
        if not text.strip():
            continue
            
        entities = ner_pipeline(text)
        # Filter only 'PER' labels (Indian names)
        for ent in entities:
            if ent['entity_group'] == 'PER':
                names.append({
                    "page": page,
                    "entity": ent['word'],
                    "type": "PER",
                    "bbox": box,
                    "confidence": float(conf)
                })
    return names


