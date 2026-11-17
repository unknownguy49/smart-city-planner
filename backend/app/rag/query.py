from langchain_community.vectorstores import Chroma

from app.rag.embeddings import embedding_model


db = Chroma(
    persist_directory="app/rag/chroma",
    embedding_function=embedding_model
)


def ask(question: str, k: int = 4):
    return db.similarity_search(question, k=k)


def get_page(page_number: int):
    """
    Retrieve a specific PDF page directly from Chroma.

    This is useful for important regulatory tables where
    semantic similarity may return nearby but incorrect
    regulation pages.
    """

    results = db.get(
        where={
            "page": page_number
        }
    )

    documents = []

    if not results or not results.get("documents"):
        return documents

    metadatas = results.get("metadatas", [])

    for index, text in enumerate(results["documents"]):

        metadata = {}

        if index < len(metadatas) and metadatas[index]:
            metadata = metadatas[index]

        from langchain_core.documents import Document

        documents.append(
            Document(
                page_content=text,
                metadata=metadata
            )
        )

    return documents