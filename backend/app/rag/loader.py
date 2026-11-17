from langchain_community.document_loaders import PyPDFLoader
import os

DATA_FOLDER = "app/rag/data"


def load_documents():
    docs = []

    for root, _, files in os.walk(DATA_FOLDER):
        for file in files:
            if file.lower().endswith(".pdf"):
                file_path = os.path.join(root, file)

                print(f"Loading: {file_path}")

                loader = PyPDFLoader(file_path)
                docs.extend(loader.load())

    print(f"Total pages loaded: {len(docs)}")

    return docs