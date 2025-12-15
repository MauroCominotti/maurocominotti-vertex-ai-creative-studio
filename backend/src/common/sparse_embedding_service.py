import logging
from typing import List, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from src.brand_guidelines.repository.brand_guideline_repository import BrandGuidelineRepository
from src.brand_guidelines.dto.brand_guideline_search_dto import BrandGuidelineSearchDto

logger = logging.getLogger(__name__)

class SparseEmbeddingService:
    """
    Service for generating sparse embeddings using TF-IDF.
    Fits a TfidfVectorizer on all available brand guidelines at initialization.
    """

    def __init__(self):
        self.vectorizer = TfidfVectorizer()
        self.is_fitted = False
        self._fit_vectorizer()

    def _fit_vectorizer(self):
        """
        Fetches all brand guidelines and fits the vectorizer.
        """
        try:
            repo = BrandGuidelineRepository()
            # Fetch all guidelines (limit 1000 for now to be safe, or iterate)
            # Assuming dataset is small enough for memory.
            # Fetch all guidelines directly from Firestore to avoid DTO validation issues
            # and to get ALL guidelines across workspaces.
            docs = repo.collection_ref.stream()
            
            corpus = []
            for doc in docs:
                data = doc.to_dict()
                # We need to manually validate/convert to model or just access dict fields
                # Accessing dict fields is safer/faster for just text extraction
                title = data.get("title", "")
                description = data.get("description", "")
                brand_rules = data.get("brand_rules", [])
                
                text = f"{title} {description}"
                if brand_rules:
                    text += " " + " ".join(brand_rules)
                corpus.append(text)
            
            if corpus:
                self.vectorizer.fit(corpus)
                self.is_fitted = True
                logger.info(f"SparseEmbeddingService fitted on {len(corpus)} documents.")
            else:
                logger.warning("SparseEmbeddingService: No documents found to fit vectorizer.")
                
        except Exception as e:
            logger.error(f"Failed to fit SparseEmbeddingService: {e}")

    def fit_on_texts(self, texts: List[str]):
        """
        Fits the vectorizer on the provided texts.
        Useful for fitting on the current guideline if the repository is empty.
        """
        if not texts:
            logger.warning("SparseEmbeddingService: No texts provided to fit.")
            return

        try:
            # If we already have a fitted model, we might want to combine?
            # TfidfVectorizer doesn't support incremental fit.
            # We will just fit on the new texts for this worker instance.
            # In a real system, we should load a pre-trained model or fit on a large corpus.
            self.vectorizer.fit(texts)
            self.is_fitted = True
            logger.info(f"SparseEmbeddingService fitted on {len(texts)} provided documents.")
        except Exception as e:
            logger.error(f"Failed to fit SparseEmbeddingService on provided texts: {e}")

    def get_sparse_embedding(self, text: str) -> Dict[str, List[Any]]:
        """
        Generates a sparse embedding for the given text.
        Returns a dict with 'values' and 'dimensions'.
        """
        if not self.is_fitted:
            logger.warning("SparseEmbeddingService not fitted. Returning empty embedding.")
            return {"values": [], "dimensions": []}

        try:
            tfidf_vector = self.vectorizer.transform([text])
            
            values = []
            dims = []
            # tfidf_vector is a sparse matrix. Iterate over non-zero elements.
            coo = tfidf_vector.tocoo()
            for i, j, v in zip(coo.row, coo.col, coo.data):
                values.append(float(v))
                dims.append(int(j))
                
            return {"values": values, "dimensions": dims}
        except Exception as e:
            logger.error(f"Failed to generate sparse embedding: {e}")
            return {"values": [], "dimensions": []}
