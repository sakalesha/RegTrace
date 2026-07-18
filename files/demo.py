from segmentation_core import ClauseSegmentationAgent

SAMPLE_TEXT = """
Chapter 4 Risk Management, Cybersecurity, Client Assets and Reporting

4. Risk Management and Cybersecurity Obligations

4.1 Every stock broker shall put in place a Board-approved cyber security and cyber resilience policy, and shall conduct a comprehensive System and Network Audit on a half-yearly basis through a CERT-In empanelled auditor.

4.1.1 The audit report referred to in clause 4.1 shall be submitted to the stock exchange within 30 days of completion of the audit, along with a management response to each finding.

4.2 Stock brokers shall ensure that client funds and client securities are kept segregated from the broker's own funds and securities at all times, and shall not use client funds for any purpose other than the purposes specified by the client.

4.3 Every stock broker shall report, on a quarterly basis, the status of segregation of client funds and securities to the stock exchange in the format specified in Annexure 4A, read with the provisions of Circular SEBI/HO/MIRSD dated as amended from time to time.

4.4 A stock broker shall conduct an internal audit of its operations at intervals of not more than six months, covering all areas including risk management, KYC, and client fund handling, and shall place the audit report before its Board within 30 days of completion.

4.6 A stock broker shall maintain records of all client complaints, including their resolution status, and shall submit a monthly report on investor grievances to the stock exchange as specified in the applicable framework.

4.6 A duplicate clause number appears here to test anomaly detection.

Annexure 4A Format for Segregation Reporting

Broker Name        Quarter        Client Funds        Client Securities
ABC Securities      Q1 2026        1,20,00,000          85,00,000
"""

def main():
    pages = [{"page_num": 1, "text": SAMPLE_TEXT, "layout_blocks": None}]
    agent = ClauseSegmentationAgent()
    result = agent.run(circular_id="circ-demo-001", pages=pages)

    print(f"=== Segmentation Run: {result.run.status} ===")
    print(f"Lines processed: {result.run.total_lines_processed}")
    print(f"Clauses produced: {result.run.total_clauses_produced}")
    print(f"Anomalies: {len(result.run.anomalies)}")
    for a in result.run.anomalies:
        print(f"  - {a}")
    print()

    print("=== Clauses ===")
    for c in result.clauses:
        indent = "  " * c.depth
        flags = f" [{', '.join(c.anomaly_flags)}]" if c.anomaly_flags else ""
        print(f"{indent}{c.number} ({c.clause_type}, conf={c.segmentation_confidence}, status={c.status}){flags}")
        print(f"{indent}  path={c.path}")
        print(f"{indent}  text=\"{c.text[:90]}{'...' if len(c.text) > 90 else ''}\"")
        print()

    print("=== Handoff message to Extraction Agent ===")
    import json
    print(json.dumps(result.handoff, indent=2))


if __name__ == "__main__":
    main()
