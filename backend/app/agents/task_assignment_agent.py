from typing import Any, List

from app.agents.base_agent import BaseAgent
from app.schemas.task import Department


class TaskAssignmentAgent(BaseAgent):
    """
    Deterministic, rule-based agent that assigns a task to an owning department.
    Uses keyword matching over the task category, title and description text.
    Unmatched tasks default to the Compliance department.
    """

    # Ordered rules: (department, keywords)
    RULES = [
        (Department.KYC, ["kyc", "know your client", "client onboarding", "account opening", "in-person verification", "ipv", "beneficial owner"]),
        (Department.INFORMATION_SECURITY, ["cyber", "security incident", "breach", "vulnerability", "penetration", "data security", "information security"]),
        (Department.IT, ["system audit", "backup", "software", "server", "data centre", "connectivity", "electronic platform", "algorithmic"]),
        (Department.FINANCE, ["reconciliation", "fund", "margin", "payment", "charge", "fee", "financial", "settlement", "bank account", "demat account"]),
        (Department.RISK, ["risk", "internal audit", "audit report", "concurrent audit", "stress test", "risk management"]),
        (Department.LEGAL, ["legal", "arbitration", "court", "suit", "agreement", "contract", "litigation"]),
        (Department.OPERATIONS, ["record", "preserve", "maintain", "retain", "log", "ledger", "complaint", "grievance", "redress", "onboarding", "register"]),
        (Department.COMPLIANCE, ["submit", "report to", "notify", "intimate", "disclosure", "publish", "sebi", "stock exchange", "clearing", "approval", "permission", "compliance officer", "code of conduct"]),
    ]

    def _match(self, text: str, keywords: List[str]) -> bool:
        return any(keyword in text for keyword in keywords)

    async def validate(self, input_data: Any):
        if not isinstance(input_data, dict) or "title" not in input_data:
            raise ValueError("Input data must be a dict containing at least 'title'.")

    async def process(self, input_data: dict) -> Department:
        category = str(input_data.get("category") or "").lower()
        text = " ".join(filter(None, [
            str(input_data.get("title") or ""),
            str(input_data.get("description") or ""),
            category,
        ])).lower()

        for department, keywords in self.RULES:
            if self._match(text, keywords):
                return department

        # Category-level fallback when no keyword hits.
        if "record" in category:
            return Department.OPERATIONS
        if "report" in category or "disclosure" in category:
            return Department.COMPLIANCE
        if "audit" in category:
            return Department.RISK
        if "cyber" in category:
            return Department.INFORMATION_SECURITY
        if "grievance" in category:
            return Department.OPERATIONS

        return Department.COMPLIANCE

    async def validate_output(self, output_data: Any):
        if not isinstance(output_data, Department):
            raise ValueError("Output must be of type Department")

    async def persist(self, output_data: Any):
        # Assignment persistence is handled by the TaskService.
        pass