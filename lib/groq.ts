import axios from 'axios';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function generateProposal(
  tenderDetails: string,
  requirements: string,
  companyInfo?: { name?: string; address?: string; phone?: string; email?: string; website?: string; refNumber?: string }
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    return generateMockProposal(tenderDetails, requirements, companyInfo);
  }

  const co = companyInfo || {};
  const prompt = `You are an expert procurement proposal writer in Rwanda with 15+ years of experience writing winning tenders.

SUBMITTING COMPANY:
Name: ${co.name || '[Your Organization Name]'}
Address: ${co.address || '[Address, Kigali, Rwanda]'}
Phone: ${co.phone || '[+250 XXX XXX XXX]'}
Email: ${co.email || '[email@company.rw]'}
Website: ${co.website || '[www.company.rw]'}
Reference: ${co.refNumber || '[REF-' + new Date().getFullYear() + '-XXX]'}

TENDER DETAILS:
${tenderDetails}

REQUIREMENTS:
${requirements}

Write a COMPREHENSIVE, FORMAL, PROFESSIONAL proposal (2500-3500 words). Use formal business English.

STRICT FORMATTING RULES:
- Do NOT use box-drawing characters anywhere
- Use only plain dashes (---) for section dividers
- For ALL tables use this EXACT markdown pipe format with header separator row:
  | Column 1 | Column 2 | Column 3 |
  |----------|----------|----------|
  | Data     | Data     | Data     |
- Use ## for section headings, ### for sub-headings
- Use **bold** for key terms

REQUIRED SECTIONS:

## 1. EXECUTIVE SUMMARY
Overview, 4 key value propositions as bullet points, summary of qualifications.

## 2. UNDERSTANDING OF REQUIREMENTS
Detailed analysis, client needs, alignment with Rwanda Vision 2050, challenges and solutions table:
| Challenge | Our Solution | Expected Outcome |
|-----------|-------------|-----------------|

## 3. TECHNICAL APPROACH & METHODOLOGY
Step-by-step plan. Include PROJECT TIMELINE TABLE:
| Phase | Key Activities | Duration | Deliverables |
|-------|---------------|----------|--------------|

## 4. ORGANIZATIONAL CAPACITY & EXPERIENCE
Company background. Past projects table:
| Project Name | Client | Value (RWF) | Duration | Outcome |
|-------------|--------|-------------|----------|---------|
Key personnel table:
| Role | Qualification | Years Experience |
|------|---------------|-----------------|

## 5. DELIVERABLES & TECHNICAL SPECIFICATIONS
Deliverables table:
| # | Deliverable | Specification | Timeline |
|---|-------------|---------------|----------|

## 6. PROJECT MANAGEMENT & TIMELINE
Milestones table:
| Milestone | Description | Target Week |
|-----------|-------------|-------------|

## 7. BUDGET & VALUE FOR MONEY
Cost breakdown table:
| Item | Description | Estimated Cost (RWF) |
|------|-------------|---------------------|
Payment schedule table:
| Payment | Trigger Milestone | Percentage |
|---------|------------------|------------|

## 8. COMPLIANCE & SUSTAINABILITY
Compliance checklist, environmental and social commitments.

## 9. CONCLUSION
Reaffirm commitment, top 5 competitive advantages, call to action.

Write formally and persuasively with Rwanda-specific context. Every table must be properly formatted markdown.`;

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 8000,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling Groq API:', error);
    return generateMockProposal(tenderDetails, requirements, companyInfo);
  }
}

function generateMockProposal(
  tenderDetails: string,
  requirements: string,
  companyInfo?: { name?: string; address?: string; phone?: string; email?: string; website?: string; refNumber?: string }
): string {
  const co = companyInfo || {};
  const currentDate = new Date().toLocaleDateString('en-RW', { year: 'numeric', month: 'long', day: 'numeric' });
  const refNum = co.refNumber || `REF-${new Date().getFullYear()}-001`;

  return `## TECHNICAL AND FINANCIAL PROPOSAL

**Tender Reference:** ${tenderDetails.split('\n')[0]}
**Proposal Reference:** ${refNum}
**Submission Date:** ${currentDate}
**Submitted By:** ${co.name || '[Your Organization Name]'}
**Address:** ${co.address || '[Street Address, Kigali, Rwanda]'}
**Telephone:** ${co.phone || '[+250 XXX XXX XXX]'}
**Email:** ${co.email || '[company@email.com]'}
**Website:** ${co.website || '[www.yourcompany.rw]'}

---

## 1. EXECUTIVE SUMMARY

We are pleased to submit this comprehensive proposal in response to the above-referenced tender. ${co.name || 'Our organization'} brings extensive experience, proven capabilities, and an unwavering commitment to delivering exceptional results that exceed client expectations.

**Key Value Propositions:**

- **PROVEN TRACK RECORD:** Over 10 years of successful project delivery in Rwanda, with a portfolio of completed projects demonstrating technical excellence and reliability.
- **LOCAL EXPERTISE:** Deep understanding of Rwanda's regulatory environment, procurement standards, and development priorities, ensuring seamless project execution.
- **TECHNICAL EXCELLENCE:** Certified professionals with international qualifications and local experience, equipped with cutting-edge tools and methodologies.
- **COMMITMENT TO QUALITY:** ISO-certified quality management systems ensuring consistent delivery of high-standard outputs that meet or exceed all specifications.

---

## 2. UNDERSTANDING OF REQUIREMENTS

${requirements}

We have thoroughly analyzed the tender documentation and identified the following key challenges and our corresponding solutions:

| Challenge | Our Solution | Expected Outcome |
|-----------|-------------|-----------------|
| Tight Timeline Requirements | Dedicated full-time project team with proven on-time delivery record | 100% on-schedule delivery |
| Quality Assurance Standards | ISO-certified QMS with three-tier inspection process | Zero defect handover |
| Local Capacity Building | Structured training and knowledge transfer program | Sustainable local capability |
| Regulatory Compliance | In-house compliance team familiar with RPPA regulations | Full regulatory adherence |

**Strategic Alignment with Rwanda Vision 2050:**
- Contribution to digital transformation and economic development goals
- Support for local content and capacity building initiatives
- Promotion of sustainable and environmentally responsible practices

---

## 3. TECHNICAL APPROACH & METHODOLOGY

Our implementation is based on internationally recognized project management methodologies adapted to Rwanda's specific context.

| Phase | Key Activities | Duration | Deliverables |
|-------|---------------|----------|--------------|
| Phase 1: Initiation & Planning | Stakeholder consultations, WBS development, risk assessment, team mobilization | Weeks 1–2 | Inception Report, Implementation Plan, Risk Register |
| Phase 2: Design & Preparation | Site assessments, technical specifications, procurement, permits | Weeks 3–4 | Technical Design Docs, QA Plan, Procurement Records |
| Phase 3: Implementation | Core execution, quality inspections, weekly reporting, corrective actions | Weeks 5–10 | Progress Reports, Inspection Reports, Interim Deliverables |
| Phase 4: Testing & Handover | Validation, punch-list resolution, training, formal acceptance | Weeks 11–12 | Final Report, As-Built Docs, Training Certificates, O&M Manuals |

**Quality Assurance Measures:**
- Three-tier quality control: self-inspection, peer review, independent audit
- Regular audits by certified QA personnel
- Third-party testing and certification where required

---

## 4. ORGANIZATIONAL CAPACITY & RELEVANT EXPERIENCE

${co.name || 'Our organization'} is a registered and licensed entity in Rwanda with extensive multi-sector project delivery experience.

**Relevant Past Projects:**

| Project Name | Client | Value (RWF) | Duration | Outcome |
|-------------|--------|-------------|----------|---------|
| [Similar Project 1] | [Government Ministry] | XXX Million | 6 months | Completed on time, 95% client satisfaction |
| [Similar Project 2] | [Private Sector/NGO] | XXX Million | 8 months | Delivered 2 weeks ahead of schedule |
| [Similar Project 3] | [International Organization] | XXX Million | 12 months | Zero safety incidents, 15% cost savings |

**Key Personnel:**

| Role | Qualification | Years Experience |
|------|---------------|-----------------|
| Project Manager | PMP Certified, MSc Project Management | 15+ years |
| Technical Lead | Advanced degree in relevant field, Professional certifications | 10+ years |
| QA Manager | ISO Lead Auditor, BSc Quality Management | 8+ years |
| Finance Officer | CPA, BSc Accounting & Finance | 7+ years |

**Certifications & Compliance:**
- ISO 9001:2015 Quality Management System
- ISO 14001:2015 Environmental Management System
- Valid RDB Registration and RRA Tax Clearance
- RSSB Compliance Certificate
- Professional Indemnity Insurance

---

## 5. DELIVERABLES & TECHNICAL SPECIFICATIONS

| # | Deliverable | Specification | Timeline |
|---|-------------|---------------|----------|
| 1 | Project Inception Report | Detailed plan, risk register, stakeholder map | End of Week 2 |
| 2 | Technical Design Documents | Compliant with RBS and international standards | End of Week 4 |
| 3 | Interim Progress Reports | Weekly, with photographic documentation | Weeks 5–10 |
| 4 | Final Implementation Report | Comprehensive, bilingual (EN/Kinyarwanda) | End of Week 11 |
| 5 | Training Materials & Certificates | Accessible formats, certified completion | End of Week 12 |
| 6 | Operation & Maintenance Manuals | Full technical documentation | End of Week 12 |

---

## 6. PROJECT MANAGEMENT & TIMELINE

| Milestone | Description | Target Week |
|-----------|-------------|-------------|
| M1: Project Kick-off | Contract signing, team mobilization, kick-off meeting | Week 1 |
| M2: Design Approval | Client sign-off on all technical design documents | Week 4 |
| M3: 50% Implementation | Mid-point review and progress validation | Week 7 |
| M4: Implementation Complete | All core activities finalized and inspected | Week 10 |
| M5: Final Acceptance | Formal handover, training complete, documentation delivered | Week 12 |

**Communication & Reporting:**
- Weekly progress reports submitted every Friday
- Bi-weekly coordination meetings with client representatives
- 24/7 emergency contact availability for critical issues

---

## 7. BUDGET & VALUE FOR MONEY

**Cost Breakdown:**

| Item | Description | Estimated Cost (RWF) |
|------|-------------|---------------------|
| Professional Fees | Qualified personnel (PM, Technical Lead, QA, Finance) | [Amount] |
| Materials & Equipment | As per approved specifications | [Amount] |
| Transportation & Logistics | Site visits, delivery, mobilization | [Amount] |
| Quality Assurance & Testing | Third-party inspections and certifications | [Amount] |
| Documentation & Reporting | Reports, manuals, training materials | [Amount] |
| Contingency (5%) | Risk buffer for unforeseen circumstances | [Amount] |
| **TOTAL** | | **[Total Amount]** |

**Payment Schedule:**

| Payment | Trigger Milestone | Percentage |
|---------|------------------|------------|
| Advance Payment | Contract signing | 20% |
| Progress Payment 1 | Completion of Phase 2 (Design Approval) | 30% |
| Progress Payment 2 | Completion of Phase 3 (Implementation) | 30% |
| Final Payment | Formal acceptance and handover | 20% |

**Value-Added Services (at no extra cost):** Extended 6-month post-delivery support, comprehensive training, digital project documentation.

---

## 8. COMPLIANCE & SUSTAINABILITY

**Regulatory Compliance:**
- Full compliance with Rwanda Public Procurement Authority (RPPA) regulations
- Adherence to Rwanda Bureau of Standards (RBS) specifications
- Compliance with environmental protection and occupational health & safety regulations
- Tax and social security obligations fully met

**Environmental & Social Commitments:**
- Minimum 70% local workforce employment
- Gender equality and inclusion in team composition
- Waste management and energy-efficient practices
- Community engagement and stakeholder consultation throughout

---

## 9. CONCLUSION

${co.name || 'Our organization'} is uniquely positioned to deliver this project with excellence. Our top competitive advantages are:

1. Extensive local experience and deep understanding of Rwanda's context
2. Proven track record of on-time, on-budget project delivery
3. Strong technical capabilities with certified, qualified personnel
4. Robust ISO-certified quality management and project control systems
5. Genuine commitment to local content, capacity building, and sustainability

We commit to delivering all project components within the specified timeline, maintaining the highest quality standards, and ensuring transparent communication throughout. We look forward to the opportunity to partner with you on this important initiative.

---

## 10. MANDATORY SUPPORTING DOCUMENTS CHECKLIST

| # | Document | Status |
|---|----------|--------|
| 1 | Company Registration Certificate (RDB) | [ ] Attached |
| 2 | Tax Identification Number (TIN) Certificate | [ ] Attached |
| 3 | Tax Clearance Certificate (RRA) — Valid | [ ] Attached |
| 4 | RSSB Compliance Certificate — Current | [ ] Attached |
| 5 | Audited Financial Statements (Last 3 years) | [ ] Attached |
| 6 | Bank Reference Letter (not older than 3 months) | [ ] Attached |
| 7 | Professional Licenses and Certifications | [ ] Attached |
| 8 | Professional Indemnity Insurance Certificate | [ ] Attached |
| 9 | CVs of Key Personnel with Academic Certificates | [ ] Attached |
| 10 | List of Similar Projects with Reference Letters | [ ] Attached |
| 11 | Sworn Affidavit of No Conflict of Interest | [ ] Attached |
| 12 | Anti-Corruption Declaration | [ ] Attached |

---

## 11. DECLARATION & AUTHORIZED SIGNATURES

We declare that all information provided in this proposal is true and accurate. We understand that any misrepresentation may lead to disqualification or contract termination.

**AUTHORIZED SIGNATORY**

Name:           _________________________________________

Title/Position: _________________________________________

Signature:      _________________________________________

Date:           ${currentDate}


**WITNESS**

Name:           _________________________________________

Signature:      _________________________________________

Date:           _________________________________________


**COMPANY CONTACT**

Primary Contact: _________________________________________
Mobile:          _________________________________________
Email:           _________________________________________

---

Respectfully submitted,

**${co.name || '[Your Organization Name]'}**
${co.address || '[Address, Kigali, Rwanda]'}
${co.phone || '[+250 XXX XXX XXX]'} | ${co.email || '[email@company.rw]'}

Date: ${currentDate}`;
}
