from langchain_community.vectorstores import Chroma

from app.rag.loader import load_documents
from app.rag.embeddings import embedding_model


def create_vector_store():
    docs = load_documents()

    # Keep each PDF page together.
    # This is important because regulation tables often
    # span multiple lines and must keep their headings,
    # activities, and numerical values together.
    chunks = []

    for doc in docs:
        text = doc.page_content.strip()

        if not text:
            continue

        chunks.append(doc)

    print(f"Documents/pages added to vector store: {len(chunks)}")

    vectordb = Chroma.from_documents(
        chunks,
        embedding_model,
        persist_directory="app/rag/chroma",
    )

    print("Vector DB Created")


if __name__ == "__main__":
    create_vector_store()