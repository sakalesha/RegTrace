# Phase 2: Solution Engineering – Part 2

## Algorithm / Agent Design: Task Generation Agent

### Objective

The Task Generation Agent is responsible for converting structured compliance obligations extracted from the **SEBI Master Circular for Stock Brokers** into executable operational tasks. Unlike the Obligation Extraction Agent, which identifies *what the regulation requires*, the Task Generation Agent determines *what operational work must be performed* by a stock broker to satisfy that requirement. The generated tasks are designed to be assigned, tracked, monitored, and audited within the RegTrace compliance workflow.

### Role in the Overall Architecture

The SEBI problem statement focuses on bridging the gap between **regulatory text and operational compliance action**. Compliance teams do not directly execute legal clauses; instead, they perform operational activities such as maintaining records, submitting reports, conducting audits, notifying regulators, updating policies, and resolving investor complaints. The Task Generation Agent performs this regulatory-to-operational transformation by converting obligation records into workflow-ready compliance tasks.

Pipeline transition:

`Obligation Extraction Agent → Task Generation Agent → Task Assignment Agent`

### Document Analysis Findings

Analysis of the uploaded SEBI Master Circular revealed several operational patterns that directly influenced the design of the Task Generation Agent.

#### Direct Mapping of Obligations to Operational Activities

Many obligations in the circular naturally correspond to operational work performed by stock brokers, including:

* maintaining records
* submitting regulatory reports
* designating responsible personnel
* conducting internal and system audits
* resolving investor complaints
* publishing disclosures
* implementing cybersecurity controls
* preserving regulatory documentation

These obligations can be transformed into executable compliance tasks with minimal ambiguity.

#### Multiple Tasks from a Single Obligation

A single regulatory obligation often requires several operational steps. For example, a reporting obligation may require data collection, validation, report preparation, submission to the Stock Exchange, and preservation of submission evidence. Therefore, one obligation may generate multiple task objects.

#### Reusable Compliance Workflows

The SEBI Master Circular contains recurring operational patterns across multiple chapters, including:

* record maintenance
* regulatory reporting
* internal audit
* system audit
* inspection readiness
* grievance handling
* disclosure management
* cybersecurity monitoring
* reconciliation and monitoring activities

These recurring patterns enable the use of standardized task templates for consistent task generation.

#### Time-Bound Compliance Requirements

Many obligations specify explicit deadlines such as:

* within seven working days
* within fifteen working days
* monthly
* quarterly
* half-yearly
* annually
* immediately upon occurrence

These temporal expressions should be translated into due-date rules and recurrence schedules.

#### Evidence-Oriented Compliance

Most regulatory obligations require documentary evidence, including:

* audit reports
* client records
* board approvals
* regulatory submissions
* screenshots
* system logs
* acknowledgements
* policy documents
* training records

Each generated task should therefore specify the evidence required for compliance verification.

#### Departmental Ownership

Operational activities described in the circular naturally align with organizational functions such as:

* Compliance
* Operations
* KYC / Client Onboarding
* Information Technology
* Information Security
* Finance
* Legal

The Task Generation Agent should recommend a functional owner for each task while leaving final ownership determination to the Task Assignment Agent.

### Inputs

The Task Generation Agent receives:

* `document_id`
* Structured obligation objects
* Clause references
* Page numbers
* Obligation metadata (deadline, frequency, condition, obligation type)

### Outputs

The agent generates a collection of structured **Task Objects**, each containing:

* Task ID
* Obligation ID
* Task title
* Task description
* Task category
* Recommended owner department
* Priority level
* Due-date rule
* Recurrence type
* Evidence requirements
* Clause reference
* Page number
* Processing status

The output status is updated to **TASKS_CREATED**.

### Functional Responsibilities

#### 1. Obligation-to-Task Conversion

The agent converts each obligation into one or more executable operational tasks that can be tracked within the compliance management system.

#### 2. Task Decomposition

When a single obligation contains multiple operational requirements, the agent generates separate task objects for each independent activity.

#### 3. Task Categorization

Tasks are classified into standardized compliance categories such as:

* Reporting
* Record Keeping
* Audit
* Grievance Redressal
* Cybersecurity
* Disclosure
* Monitoring
* Governance
* Operational Compliance

#### 4. Priority Determination

Task priority is derived from regulatory urgency, time sensitivity, and the potential compliance impact of non-fulfilment.

Typical priority levels include:

* Critical
* High
* Medium
* Low

#### 5. Due-Date Rule Generation

The agent converts regulatory timelines into operational due-date rules.

Examples:

* within seven working days
* within fifteen working days
* monthly
* quarterly
* annually
* immediately

#### 6. Recurrence Identification

Tasks are classified as:

* One-time
* Event-based
* Monthly
* Quarterly
* Half-yearly
* Annual
* Continuous Monitoring

#### 7. Functional Ownership Recommendation

The agent recommends the most appropriate department responsible for executing the task based on the regulatory context.

#### 8. Evidence Requirement Generation

For each task, the agent specifies the documentation or evidence required to demonstrate compliance.

Examples:

* Audit report
* Client ledger
* Regulatory submission receipt
* Board resolution
* Screenshot
* System log
* Policy document
* Complaint resolution record

### Processing Algorithm

The Task Generation Agent operates using the following workflow:

1. Receive obligation objects.
2. Identify obligation category.
3. Select an appropriate task generation template.
4. Generate one or more operational tasks.
5. Determine task category.
6. Determine priority level.
7. Derive due-date rule.
8. Determine recurrence type.
9. Recommend owner department.
10. Generate evidence requirements.
11. Store task objects.
12. Update document status to **TASKS_CREATED**.

### Structured Output Model

Each Task Object contains:

* `task_id`
* `obligation_id`
* `title`
* `description`
* `category`
* `recommended_owner`
* `priority`
* `due_rule`
* `recurrence`
* `evidence_required`
* `clause_reference`
* `page_number`
* `status`

This structured representation becomes the direct input for the Task Assignment Agent.

### State Transition

Document lifecycle after task generation:

`OBLIGATIONS_EXTRACTED`
↓
`TASKS_CREATED`
↓
`HANDOFF TO TASK ASSIGNMENT AGENT`

### Error Handling

| Failure Scenario                    | System Action                                   |
| ----------------------------------- | ----------------------------------------------- |
| Ambiguous operational action        | Generate a generic compliance task              |
| Missing regulatory deadline         | Create task without due-date rule               |
| Multiple possible owner departments | Recommend Compliance Department                 |
| Complex multi-step obligation       | Generate a task checklist                       |
| Low extraction confidence           | Flag task for human review                      |
| Missing evidence requirement        | Assign generic documentary evidence placeholder |

### Time Complexity

For **K obligation records**:

* Template selection: **O(K)**
* Task generation: **O(K)**
* Metadata enrichment: **O(K)**

The overall task generation process is **linear with the number of extracted obligations**, making it suitable for large regulatory corpora such as the SEBI Master Circular.

### Design Rationale

The SEBI Master Circular is operationally oriented and repeatedly requires stock brokers to perform concrete activities such as maintaining records, conducting audits, submitting reports, implementing cybersecurity controls, resolving investor complaints, and publishing regulatory disclosures. Therefore, the Task Generation Agent is designed as a **template-driven compliance workflow generator** rather than a free-form text generator. Standardized templates ensure consistency across similar obligations, reduce language-model variability, improve auditability, and preserve complete traceability between every generated task and its originating clause and page within the SEBI Master Circular.

### Conclusion

The Task Generation Agent transforms structured regulatory obligations into executable compliance tasks that can be assigned, monitored, completed, and audited within the RegTrace platform. By generating standardized task records with categories, priorities, deadlines, recurrence rules, evidence requirements, and regulatory traceability, the agent creates the operational compliance workflow required for automated compliance management, evidence collection, compliance evaluation, and regulatory audit readiness.
