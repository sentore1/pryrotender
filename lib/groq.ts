import axios from 'axios';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function generateProposal(
  tenderDetails: string,
  requirements: string
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  
  // If API key is not configured, return a mock proposal
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    console.log('Using comprehensive mock proposal - GROQ_API_KEY not configured');
    return generateMockProposal(tenderDetails, requirements);
  }

  const prompt = `You are an expert proposal writer for procurement tenders in Rwanda with over 15 years of experience. 

TENDER DETAILS:
${tenderDetails}

REQUIREMENTS:
${requirements}

Write a COMPREHENSIVE, PROFESSIONAL, and DETAILED proposal of 3-5 pages (approximately 2000-3500 words) that addresses all requirements. The proposal must be structured, persuasive, and demonstrate deep expertise.

REQUIRED STRUCTURE (Include ALL sections with substantial detail):

1. COVER PAGE & EXECUTIVE SUMMARY (1/2 page)
   - Proposal title and reference
   - Brief overview of our understanding and approach
   - Key value propositions (3-4 compelling points)
   - Summary of qualifications

2. UNDERSTANDING OF REQUIREMENTS (3/4 page)
   - Detailed analysis of tender requirements
   - Demonstrate deep understanding of client needs
   - Identify key challenges and opportunities
   - Show alignment with Rwanda's development goals

3. TECHNICAL APPROACH & METHODOLOGY (1 page)
   - Detailed step-by-step implementation plan
   - Specific methodologies and frameworks to be used
   - Quality assurance measures
   - Risk mitigation strategies
   - Innovation and best practices
   - Timeline with clear milestones

4. ORGANIZATIONAL CAPACITY & EXPERIENCE (3/4 page)
   - Company background and track record
   - Relevant past projects in Rwanda (provide 2-3 examples)
   - Team composition and key personnel qualifications
   - Certifications, registrations, and compliance
   - Local presence and partnerships

5. TECHNICAL SPECIFICATIONS & DELIVERABLES (1/2 page)
   - Detailed list of deliverables
   - Technical specifications and standards
   - Quality benchmarks
   - Documentation and reporting

6. PROJECT MANAGEMENT & TIMELINE (1/2 page)
   - Detailed project phases with durations
   - Resource allocation plan
   - Communication and reporting structure
   - Stakeholder engagement approach

7. BUDGET & VALUE FOR MONEY (1/3 page)
   - Cost breakdown structure
   - Value-added services
   - Payment terms and schedule
   - Cost optimization strategies

8. COMPLIANCE & SUSTAINABILITY (1/3 page)
   - Regulatory compliance (Rwanda standards)
   - Environmental considerations
   - Social responsibility commitments
   - Local content and capacity building

9. CONCLUSION & COMMITMENT (1/4 page)
   - Reaffirm commitment to excellence
   - Highlight competitive advantages
   - Call to action

WRITING GUIDELINES:
- Use professional, clear, and persuasive language
- Include specific details, not generic statements
- Use bullet points and numbered lists for clarity
- Reference Rwanda-specific context and regulations
- Demonstrate cultural awareness and local knowledge
- Use concrete examples and quantifiable metrics
- Maintain formal business tone throughout
- Ensure logical flow between sections

Make this proposal compelling, detailed, and ready for submission. Write in a way that clearly demonstrates why we are the best choice for this tender.`;

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 8000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling Groq API:', error);
    // Fallback to mock proposal if API fails
    return generateMockProposal(tenderDetails, requirements);
  }
}

function generateMockProposal(tenderDetails: string, requirements: string): string {
  const currentDate = new Date().toLocaleDateString('en-RW', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  return `═══════════════════════════════════════════════════════════════════════════════
                        TECHNICAL AND FINANCIAL PROPOSAL
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                         [COMPANY LOGO PLACEHOLDER]                          │
│                                                                             │
│                    Insert your company logo here (300x100px)                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

TENDER REFERENCE: ${tenderDetails.split('\n')[0]}
SUBMISSION DATE: ${currentDate}
SUBMITTED BY: [Your Organization Name]
COMPANY ADDRESS: [Street Address, City, Rwanda]
TELEPHONE: [+250 XXX XXX XXX]
EMAIL: [company@email.com]
WEBSITE: [www.yourcompany.rw]

═══════════════════════════════════════════════════════════════════════════════
                            1. EXECUTIVE SUMMARY
═══════════════════════════════════════════════════════════════════════════════

We are pleased to submit this comprehensive proposal in response to the above-referenced 
tender opportunity. Our organization brings extensive experience, proven capabilities, and 
a deep commitment to delivering exceptional results that exceed client expectations.

KEY VALUE PROPOSITIONS:

• PROVEN TRACK RECORD: Over 10 years of successful project delivery in Rwanda, with a 
  portfolio of completed projects demonstrating our technical excellence and reliability.

• LOCAL EXPERTISE: Deep understanding of Rwanda's regulatory environment, procurement 
  standards, and development priorities, ensuring seamless project execution.

• TECHNICAL EXCELLENCE: Certified professionals with international qualifications and 
  local experience, equipped with cutting-edge tools and methodologies.

• COMMITMENT TO QUALITY: ISO-certified quality management systems ensuring consistent 
  delivery of high-standard outputs that meet or exceed specifications.

Our proposal demonstrates how we will deliver superior value through innovative approaches,
efficient resource utilization, and unwavering commitment to project success.

═══════════════════════════════════════════════════════════════════════════════
              2. UNDERSTANDING OF REQUIREMENTS & PROJECT CONTEXT
═══════════════════════════════════════════════════════════════════════════════

DETAILED REQUIREMENTS ANALYSIS:

${requirements}

CONTEXTUAL UNDERSTANDING:

We have thoroughly analyzed the tender documentation and identified the following key 
requirements and success factors:

1. TECHNICAL REQUIREMENTS
   • Compliance with Rwanda Bureau of Standards (RBS) specifications
   • Adherence to international best practices and quality standards
   • Integration with existing systems and infrastructure where applicable
   • Sustainable and environmentally responsible solutions

2. OPERATIONAL REQUIREMENTS
   • Timely delivery within specified deadlines
   • Minimal disruption to ongoing operations
   • Comprehensive documentation and knowledge transfer
   • Post-delivery support and maintenance provisions

3. STRATEGIC ALIGNMENT
   • Contribution to Rwanda's Vision 2050 development goals
   • Support for digital transformation initiatives
   • Capacity building for local workforce
   • Promotion of local content and value addition

IDENTIFIED CHALLENGES & OUR SOLUTIONS:

Challenge 1: Tight Timeline Requirements
Solution: Dedicated project team with proven track record of on-time delivery, supported 
by robust project management systems and contingency planning.

Challenge 2: Quality Assurance Standards
Solution: ISO-certified quality management processes, regular inspections, and third-party 
verification to ensure compliance with all specifications.

Challenge 3: Local Capacity Building
Solution: Structured training programs and knowledge transfer sessions to build sustainable 
local capacity and ensure long-term project success.

═══════════════════════════════════════════════════════════════════════════════
              3. TECHNICAL APPROACH & IMPLEMENTATION METHODOLOGY
═══════════════════════════════════════════════════════════════════════════════

IMPLEMENTATION FRAMEWORK:

Our approach is based on internationally recognized project management methodologies 
adapted to Rwanda's specific context and requirements.

PHASE 1: PROJECT INITIATION & PLANNING (Weeks 1-2)

Activities:
• Conduct comprehensive stakeholder consultation meetings
• Finalize detailed project scope and deliverables matrix
• Establish project governance structure and communication protocols
• Develop detailed work breakdown structure (WBS)
• Conduct risk assessment and mitigation planning
• Mobilize project team and resources

Deliverables:
• Project Inception Report
• Detailed Implementation Plan
• Risk Management Plan
• Communication and Stakeholder Engagement Plan

PHASE 2: DETAILED DESIGN & PREPARATION (Weeks 3-4)

Activities:
• Conduct detailed site assessments and surveys (if applicable)
• Develop technical specifications and design documents
• Procure necessary materials, equipment, and resources
• Conduct pre-implementation quality checks
• Finalize logistics and resource allocation
• Obtain necessary permits and approvals

Deliverables:
• Technical Design Documents
• Quality Assurance Plan
• Resource Mobilization Report
• Procurement Documentation

PHASE 3: IMPLEMENTATION & EXECUTION (Weeks 5-10)

Activities:
• Execute core project activities according to approved plans
• Conduct regular quality inspections and progress monitoring
• Maintain detailed documentation of all activities
• Hold weekly progress review meetings with stakeholders
• Implement corrective actions as needed
• Ensure compliance with health, safety, and environmental standards

Deliverables:
• Weekly Progress Reports
• Quality Inspection Reports
• Photographic Documentation
• Interim Deliverables as specified

PHASE 4: TESTING, VALIDATION & HANDOVER (Weeks 11-12)

Activities:
• Conduct comprehensive testing and validation procedures
• Address any identified deficiencies or punch-list items
• Prepare complete project documentation
• Conduct training sessions for end-users and maintenance staff
• Facilitate formal acceptance and handover procedures
• Establish post-delivery support mechanisms

Deliverables:
• Final Project Report
• As-Built Documentation
• Training Materials and Certificates
• Operation and Maintenance Manuals
• Warranty and Support Documentation

QUALITY ASSURANCE MEASURES:

• Three-tier quality control system (self-inspection, peer review, independent audit)
• Regular quality audits by certified quality assurance personnel
• Compliance verification against approved specifications and standards
• Photographic and video documentation of key milestones
• Third-party testing and certification where required

INNOVATION & BEST PRACTICES:

• Adoption of latest technologies and methodologies
• Sustainable and environmentally friendly approaches
• Digital project management and reporting systems
• Continuous improvement through lessons learned sessions

═══════════════════════════════════════════════════════════════════════════════
              4. ORGANIZATIONAL CAPACITY & RELEVANT EXPERIENCE
═══════════════════════════════════════════════════════════════════════════════

COMPANY PROFILE:

Our organization is a registered and licensed entity in Rwanda with extensive experience 
in delivering complex projects across various sectors. We maintain:

• Valid registration with Rwanda Development Board (RDB)
• Tax compliance certificate from Rwanda Revenue Authority (RRA)
• Social Security Fund (RSSB) compliance
• Professional liability insurance coverage
• ISO 9001:2015 Quality Management System certification

RELEVANT EXPERIENCE IN RWANDA:

Project 1: [Similar Project Name]
Client: [Government Ministry/Agency]
Value: RWF XXX Million
Duration: 6 months
Scope: [Brief description of scope and deliverables]
Outcome: Successfully completed on time and within budget, with client satisfaction rating 
of 95%. Project contributed to improved service delivery and operational efficiency.

Project 2: [Similar Project Name]
Client: [Private Sector/NGO]
Value: RWF XXX Million
Duration: 8 months
Scope: [Brief description of scope and deliverables]
Outcome: Exceeded performance targets, delivered 2 weeks ahead of schedule. Received 
commendation for quality of work and professional project management.

Project 3: [Similar Project Name]
Client: [International Organization]
Value: RWF XXX Million
Duration: 12 months
Scope: [Brief description of scope and deliverables]
Outcome: Achieved all project objectives with zero safety incidents. Implemented innovative 
solutions that resulted in 15% cost savings while maintaining quality standards.

KEY PERSONNEL & TEAM COMPOSITION:

Project Manager: [Name/Qualification]
• 15+ years of project management experience
• PMP certified with track record of successful project delivery
• Extensive experience in Rwanda's regulatory environment

Technical Lead: [Name/Qualification]
• Advanced degree in relevant field
• 10+ years of technical expertise
• Professional certifications and registrations

Quality Assurance Manager: [Name/Qualification]
• ISO Lead Auditor certification
• 8+ years in quality management
• Experience with international quality standards

CERTIFICATIONS & COMPLIANCE:

✓ ISO 9001:2015 Quality Management System
✓ ISO 14001:2015 Environmental Management System
✓ OHSAS 18001 Occupational Health & Safety
✓ Rwanda Bureau of Standards (RBS) compliance
✓ Professional indemnity insurance coverage
✓ Valid tax clearance certificate

LOCAL PRESENCE & PARTNERSHIPS:

• Established office in Kigali with full-time staff
• Strong partnerships with local suppliers and subcontractors
• Commitment to local content and capacity building
• Active member of relevant professional associations in Rwanda

═══════════════════════════════════════════════════════════════════════════════
                  5. TECHNICAL SPECIFICATIONS & DELIVERABLES
═══════════════════════════════════════════════════════════════════════════════

DETAILED DELIVERABLES MATRIX:

1. PRIMARY DELIVERABLES
   • [Specific deliverable 1 with technical specifications]
   • [Specific deliverable 2 with technical specifications]
   • [Specific deliverable 3 with technical specifications]
   • All deliverables compliant with Rwanda standards and specifications

2. DOCUMENTATION DELIVERABLES
   • Comprehensive project documentation in English and Kinyarwanda
   • Technical drawings and specifications (where applicable)
   • Operation and maintenance manuals
   • Training materials and user guides
   • Quality assurance and testing reports

3. TRAINING & CAPACITY BUILDING
   • Structured training programs for end-users
   • Train-the-trainer sessions for sustainability
   • Training materials in accessible formats
   • Certification of training completion

QUALITY STANDARDS & BENCHMARKS:

• Compliance with Rwanda Bureau of Standards (RBS) requirements
• Adherence to international standards (ISO, IEC, etc.)
• Industry-specific quality benchmarks and best practices
• Client-specified performance indicators and acceptance criteria

═══════════════════════════════════════════════════════════════════════════════
                    6. PROJECT MANAGEMENT & TIMELINE
═══════════════════════════════════════════════════════════════════════════════

DETAILED PROJECT SCHEDULE:

Week 1-2:   Project Initiation & Planning
Week 3-4:   Detailed Design & Preparation
Week 5-10:  Implementation & Execution
Week 11-12: Testing, Validation & Handover

CRITICAL MILESTONES:

Milestone 1: Project Kick-off Meeting (Week 1)
Milestone 2: Design Approval (Week 4)
Milestone 3: 50% Implementation Complete (Week 7)
Milestone 4: Implementation Complete (Week 10)
Milestone 5: Final Acceptance & Handover (Week 12)

RESOURCE ALLOCATION:

• Dedicated project team assigned full-time to this project
• Backup resources available for contingency situations
• Specialized equipment and tools as required
• Quality assurance personnel for regular inspections

COMMUNICATION & REPORTING:

• Weekly progress reports submitted every Friday
• Monthly detailed progress reports with photographic documentation
• Bi-weekly coordination meetings with client representatives
• 24/7 emergency contact availability
• Digital project dashboard for real-time progress tracking

STAKEHOLDER ENGAGEMENT:

• Regular consultation with key stakeholders
• Transparent communication of progress and challenges
• Collaborative problem-solving approach
• Feedback mechanisms for continuous improvement

═══════════════════════════════════════════════════════════════════════════════
                      7. BUDGET & VALUE FOR MONEY
═══════════════════════════════════════════════════════════════════════════════

COST STRUCTURE:

Our pricing is competitive and reflects the true value of services provided. We have 
carefully considered all cost elements to ensure transparency and value for money:

1. DIRECT COSTS
   • Professional fees for qualified personnel
   • Materials and equipment as per specifications
   • Transportation and logistics
   • Testing and quality assurance

2. INDIRECT COSTS
   • Project management and coordination
   • Quality control and supervision
   • Documentation and reporting
   • Insurance and risk management

3. VALUE-ADDED SERVICES (Included at no extra cost)
   • Extended warranty period beyond standard requirements
   • Comprehensive training programs
   • Post-delivery technical support (6 months)
   • Digital project documentation and handover materials

PAYMENT TERMS:

• Advance Payment: 20% upon contract signing
• Progress Payment 1: 30% upon completion of Phase 2
• Progress Payment 2: 30% upon completion of Phase 3
• Final Payment: 20% upon successful completion and acceptance

COST OPTIMIZATION STRATEGIES:

• Efficient resource utilization and waste minimization
• Bulk procurement advantages passed to client
• Local sourcing where possible to reduce costs
• Streamlined processes to minimize overhead

═══════════════════════════════════════════════════════════════════════════════
                  8. COMPLIANCE & SUSTAINABILITY
═══════════════════════════════════════════════════════════════════════════════

REGULATORY COMPLIANCE:

✓ Full compliance with Rwanda Public Procurement Authority (RPPA) regulations
✓ Adherence to Rwanda Bureau of Standards (RBS) specifications
✓ Compliance with environmental protection regulations
✓ Occupational health and safety standards compliance
✓ Tax compliance and social security obligations

ENVIRONMENTAL CONSIDERATIONS:

• Environmental impact assessment and mitigation measures
• Waste management and recycling protocols
• Energy-efficient solutions and practices
• Sustainable resource utilization
• Carbon footprint minimization strategies

SOCIAL RESPONSIBILITY:

• Employment of local workforce (minimum 70% local content)
• Fair labor practices and decent working conditions
• Gender equality and inclusion in team composition
• Community engagement and stakeholder consultation
• Support for local suppliers and subcontractors

CAPACITY BUILDING COMMITMENTS:

• Skills transfer to local personnel through on-the-job training
• Formal training programs with certification
• Mentorship and knowledge sharing initiatives
• Support for local enterprise development
• Contribution to Rwanda's human capital development goals

═══════════════════════════════════════════════════════════════════════════════
                      9. CONCLUSION & COMMITMENT
═══════════════════════════════════════════════════════════════════════════════

We are confident that our proposal demonstrates:

✓ DEEP UNDERSTANDING of project requirements and context
✓ PROVEN CAPABILITY to deliver complex projects successfully
✓ STRONG COMMITMENT to quality, timeliness, and client satisfaction
✓ COMPETITIVE PRICING with excellent value for money
✓ ALIGNMENT with Rwanda's development priorities and standards

OUR COMPETITIVE ADVANTAGES:

1. Extensive local experience and understanding of Rwanda's context
2. Proven track record of successful project delivery
3. Strong technical capabilities and qualified personnel
4. Robust quality management and project control systems
5. Commitment to local content and capacity building
6. Financial stability and professional indemnity coverage

COMMITMENT TO EXCELLENCE:

We commit to:
• Delivering all project components within the specified timeline
• Maintaining the highest quality standards throughout
• Ensuring transparent communication and reporting
• Adhering to all regulatory and contractual requirements
• Providing exceptional post-delivery support
• Contributing to sustainable development outcomes

We look forward to the opportunity to partner with you on this important project and 
demonstrate our capabilities in delivering exceptional results.

═══════════════════════════════════════════════════════════════════════════════
                    10. MANDATORY SUPPORTING DOCUMENTS
═══════════════════════════════════════════════════════════════════════════════

Please ensure the following documents are attached with this proposal:

LEGAL & REGISTRATION DOCUMENTS:
☐ 1.  Valid Company Registration Certificate from Rwanda Development Board (RDB)
☐ 2.  Tax Identification Number (TIN) Certificate
☐ 3.  Tax Clearance Certificate from Rwanda Revenue Authority (RRA) - Valid
☐ 4.  Social Security Fund (RSSB) Compliance Certificate - Current
☐ 5.  Certificate of Incorporation or Business Registration

FINANCIAL DOCUMENTS:
☐ 6.  Audited Financial Statements (Last 3 years)
☐ 7.  Bank Reference Letter (Not older than 3 months)
☐ 8.  Financial Capacity Statement
☐ 9.  Proof of Access to Credit Facilities (if applicable)

TECHNICAL & PROFESSIONAL DOCUMENTS:
☐ 10. Professional Licenses and Certifications (ISO, RBS, etc.)
☐ 11. Professional Indemnity Insurance Certificate - Valid
☐ 12. CVs of Key Personnel with Academic Certificates
☐ 13. List of Similar Projects Completed (with Reference Letters)
☐ 14. Equipment List and Ownership/Lease Documents

COMPLIANCE DOCUMENTS:
☐ 15. Sworn Affidavit of No Conflict of Interest
☐ 16. Anti-Corruption Declaration
☐ 17. Environmental Compliance Certificate (if applicable)
☐ 18. Health & Safety Policy Document

NOTE: All documents must be certified true copies. Original documents may be requested 
for verification during evaluation.

═══════════════════════════════════════════════════════════════════════════════
                        11. AUTHORIZED SIGNATURES
═══════════════════════════════════════════════════════════════════════════════

DECLARATION:

We declare that all information provided in this proposal is true and accurate to the 
best of our knowledge. We understand that any misrepresentation may lead to 
disqualification or contract termination.

We confirm that we have read, understood, and accept all terms and conditions of the 
tender document. We commit to execute the project as per specifications if awarded.


AUTHORIZED SIGNATORY:

Name: _________________________________________

Title/Position: _________________________________________

Signature: _________________________________________

Date: ${currentDate}


┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                      [COMPANY OFFICIAL STAMP/SEAL]                          │
│                                                                             │
│                    Affix your company stamp here                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘


WITNESS (If Required):

Name: _________________________________________

Title/Position: _________________________________________

Signature: _________________________________________

Date: _________________________________________


COMPANY CONTACT INFORMATION:

Primary Contact Person: _________________________________________
Mobile: _________________________________________
Email: _________________________________________
Alternative Contact: _________________________________________
Emergency Contact: _________________________________________

═══════════════════════════════════════════════════════════════════════════════

SUBMISSION INSTRUCTIONS:

1. Print this proposal on company letterhead
2. Insert company logo at the designated space on page 1
3. Sign all required signature fields
4. Affix official company stamp/seal
5. Attach all mandatory supporting documents (checklist above)
6. Submit in sealed envelope marked with tender reference number
7. Ensure submission before deadline specified in tender notice

For electronic submissions:
• Save as PDF with all signatures and stamps scanned
• File name format: [TenderRef]_[CompanyName]_Proposal.pdf
• Submit through official procurement portal or email as instructed

═══════════════════════════════════════════════════════════════════════════════

Respectfully submitted,

[Your Organization Name]
[Authorized Signatory Name and Title]
[Contact Information]

Date: ${currentDate}

═══════════════════════════════════════════════════════════════════════════════
                              END OF PROPOSAL
═══════════════════════════════════════════════════════════════════════════════

NOTE: This is a comprehensive sample proposal generated for demonstration purposes. 
To generate AI-powered custom proposals tailored to specific tenders, please configure 
your GROQ_API_KEY in the .env.local file.

Get your free API key at: https://console.groq.com/keys

═══════════════════════════════════════════════════════════════════════════════`;
}
