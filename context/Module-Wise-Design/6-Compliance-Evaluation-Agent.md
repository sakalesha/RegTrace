# Phase 2: Solution Engineering – Part 2

## Algorithm / Agent Design: Compliance Evaluation Agent

### Objective

The Compliance Evaluation Agent is responsible for determining whether the compliance obligations extracted from the **SEBI Master Circular for Stock Brokers** have been successfully fulfilled. It evaluates the operational tasks generated from regulatory obligations against the evidence submitted by the stock broker and produces a structured compliance assessment. Unlike the Task Generation Agent, which creates operational work items, the Compliance Evaluation Agent determines whether those tasks have been completed correctly, on time, and with sufficient supporting evidence to satisfy the underlying SEBI requirement.

### Role in the Overall Architecture

The SEBI problem statement emphasizes **ongoing compliance management**, including mapping obligations to evidence, maintaining audit trails, and identifying compliance gaps before they become regulatory findings. The Compliance Evaluation Agent closes the compliance loop by assessing whether submitted evidence demonstrates actual regulatory compliance. It receives task records, evidence records, and obligation metadata, and produces structured compliance assessment records that are passed to the Gap Analysis Agent.

Pipeline transition:

`Evidence Collection Agent → Compliance Evaluation Agent → Gap Analysis Agent`

### Document Analysis Findings

Analysis of the uploaded SEBI Master Circular revealed several characteristics that directly influenced the design of the Compliance Evaluation Agent.

#### Evidence-Driven Compliance

The circular repeatedly requires stock brokers to maintain records, submit reports, preserve documents, conduct audits, publish disclosures, and maintain operational logs. Examples include internal audit reports, system audit reports, client records, grievance records, cybersecurity reports, website disclosures, and regulatory submissions. Compliance under SEBI is therefore primarily **evidence-based**, requiring documentary proof of fulfilment.

#### Multiple Compliance States

Many regulatory obligations cannot be evaluated using a simple pass/fail model. For example:

* required documentation exists but is incomplete,
* reports were submitted after the prescribed deadline,
* audits were conducted but findings remain unresolved,
* disclosures are available but mandatory information is missing.

The evaluation model therefore supports multiple compliance states rather than binary classification.

#### Time-Bound Compliance

The SEBI Master Circular contains numerous obligations with explicit timelines such as:

* within seven working days,
* within fifteen working days,
* monthly,
* quarterly,
* half-yearly,
* annually,
* immediately.

Compliance evaluation must therefore assess both **evidence validity and timeliness**.

#### Variable Evidence Quality

Evidence submitted by stock brokers may include:

* PDF documents,
* scanned files,
* screenshots,
* email acknowledgements,
* system logs,
* spreadsheets,
* regulatory submission receipts,
* policy documents,
* board resolutions.

The agent must evaluate the **completeness, relevance, authenticity indicators, and quality** of submitted evidence.

#### Clause-Level Traceability

SEBI inspections require demonstrating compliance against **specific regulatory clauses**. Every compliance decision must therefore remain traceable to the originating chapter, section number, clause number, page number, and source document.

#### Hybrid Evaluation Opportunity

Many obligations can be evaluated deterministically, such as verifying document existence, checking submission dates, confirming required disclosures, or validating report submissions. However, qualitative evidence such as policy adequacy or procedural sufficiency may require language-model reasoning. This supports a **hybrid evaluation approach combining deterministic rules with AI-based assessment**.

### Inputs

The Compliance Evaluation Agent receives:

* `document_id`
* Structured obligation objects
* Generated task objects
* Submitted evidence objects
* Due-date rules
* Clause references
* Page references

### Outputs

The agent generates a collection of structured **Compliance Assessment Objects**, each containing:

* Evaluation ID
* Task ID
* Obligation ID
* Compliance status
* Compliance score
* Evidence availability
* Evidence quality
* Deadline compliance
* Evaluation findings
* Clause reference
* Page number
* Evaluation timestamp

The output status is updated to **COMPLIANCE_EVALUATED**.

### Functional Responsibilities

#### 1. Evidence Verification

The agent verifies whether the required evidence has been submitted for each compliance task.

#### 2. Evidence Relevance Assessment

The submitted evidence is checked for relevance to the associated regulatory obligation and task.

#### 3. Evidence Completeness Evaluation

The agent determines whether the evidence contains all mandatory components, including signatures, dates, identifiers, approvals, acknowledgements, or supporting documentation where required.

#### 4. Deadline Verification

Submission timestamps are compared against the regulatory due-date rules extracted from the SEBI obligation.

#### 5. Rule-Based Compliance Evaluation

Deterministic checks are applied wherever objective compliance criteria exist.

Examples:

* mandatory document present,
* report submitted before due date,
* required disclosure available,
* audit report attached,
* complaint resolved within prescribed timeline.

#### 6. Qualitative Compliance Assessment

For obligations that require interpretation of policy documents, procedures, governance records, or operational controls, the agent applies language-model reasoning to evaluate compliance quality.

#### 7. Compliance Status Classification

Each task is classified into one of the following compliance states:

* **Compliant**
* **Partially Compliant**
* **Non-Compliant**
* **Overdue**
* **Pending Review**
* **Not Applicable**

#### 8. Confidence Scoring

The agent generates a confidence score indicating the reliability of the compliance assessment based on evidence quality and evaluation certainty.

### Processing Algorithm

The Compliance Evaluation Agent operates using the following workflow:

1. Receive task and evidence records.
2. Retrieve the associated obligation.
3. Identify required evidence.
4. Verify evidence presence.
5. Verify evidence relevance.
6. Verify evidence completeness.
7. Verify submission timeliness.
8. Apply deterministic compliance rules.
9. Apply qualitative assessment where required.
10. Assign compliance status.
11. Generate findings and confidence score.
12. Store compliance assessment records.
13. Update document status to **COMPLIANCE_EVALUATED**.

### Structured Output Model

Each Compliance Assessment Object contains:

* `evaluation_id`
* `task_id`
* `obligation_id`
* `compliance_status`
* `score`
* `evidence_present`
* `evidence_quality`
* `deadline_met`
* `findings`
* `clause_reference`
* `page_number`
* `evaluated_at`

This structured representation becomes the direct input for the Gap Analysis Agent.

### State Transition

Document lifecycle after compliance evaluation:

`EVIDENCE_SUBMITTED`
↓
`COMPLIANCE_EVALUATED`
↓
`HANDOFF TO GAP ANALYSIS AGENT`

### Error Handling

| Failure Scenario            | System Action                               |
| --------------------------- | ------------------------------------------- |
| Evidence missing            | Mark task as **Non-Compliant**              |
| Evidence incomplete         | Mark task as **Partially Compliant**        |
| Deadline exceeded           | Mark task as **Overdue**                    |
| Ambiguous evidence          | Mark task as **Pending Review**             |
| Rule evaluation failure     | Escalate for human review                   |
| Unsupported evidence format | Preserve evidence and flag evaluation error |

### Time Complexity

For **T compliance tasks**:

* Evidence lookup: **O(T)**
* Rule evaluation: **O(T)**
* Metadata verification: **O(T)**
* Qualitative assessment: proportional to the number of tasks requiring AI reasoning

The overall evaluation process is effectively **linear with the number of compliance tasks**, making it suitable for large regulatory compliance workloads.

### Design Rationale

The SEBI Master Circular defines compliance primarily through **demonstrable evidence rather than declarations**. Most obligations require documentation, reporting, audit records, disclosures, or operational artifacts that can be objectively verified. Therefore, the Compliance Evaluation Agent is designed as a **hybrid evidence verification engine** that combines deterministic regulatory checks with language-model-assisted qualitative reasoning. This approach improves evaluation accuracy, preserves traceability to the originating SEBI clause and page number, and provides a reliable compliance assessment layer for downstream gap analysis and audit reporting.

### Conclusion

The Compliance Evaluation Agent transforms submitted operational evidence into structured regulatory compliance assessments. By verifying evidence availability, relevance, completeness, timeliness, and qualitative adequacy, the agent determines whether each SEBI obligation has been fulfilled and produces audit-ready compliance records with complete regulatory traceability. This evaluation layer enables automated compliance monitoring, gap identification, audit preparation, and regulatory inspection readiness within the RegTrace architecture.
