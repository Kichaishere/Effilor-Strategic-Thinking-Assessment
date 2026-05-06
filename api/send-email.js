export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, company, role, phone, answers, timestamp } = req.body;

  // Validate required fields
  if (!name || !email || !company || !role || !answers) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Calculate scores for the email
  const pillarScores = {
    'Thinking Far': 0,
    'Thinking Big': 0,
    'Thinking Different': 0
  };

  // Questions pillar mapping
  const pillarMapping = [
    'Thinking Far', 'Thinking Far', 'Thinking Far', 'Thinking Far', 'Thinking Far', 'Thinking Far',
    'Thinking Big', 'Thinking Big', 'Thinking Big', 'Thinking Big', 'Thinking Big', 'Thinking Big',
    'Thinking Different', 'Thinking Different', 'Thinking Different', 'Thinking Different', 'Thinking Different', 'Thinking Different'
  ];

  Object.entries(answers).forEach(([index, value]) => {
    const pillar = pillarMapping[parseInt(index)];
    if (pillar) {
      pillarScores[pillar] += value;
    }
  });

  const totalScore = Object.values(pillarScores).reduce((a, b) => a + b, 0);
  
  // Get level
  let level = 'Transactional Thinking';
  if (totalScore >= 67) {
    level = 'Strategic Thinking';
  } else if (totalScore >= 43) {
    level = 'Emerging Strategic Thinking';
  }

  // Prepare the assessment data
  const assessmentData = {
    submittedAt: timestamp || new Date().toISOString(),
    name: name,
    email: email,
    company: company,
    role: role,
    phone: phone || 'Not provided',
    totalScore: totalScore,
    level: level,
    pillarScores: pillarScores,
    answers: answers
  };

  // Create detailed email body
  const emailBody = `
New Strategic Thinking Quotient Assessment Submission

SUBMITTED: ${assessmentData.submittedAt}

CONTACT INFORMATION:
Name: ${assessmentData.name}
Email: ${assessmentData.email}
Company: ${assessmentData.company}
Role: ${assessmentData.role}
Phone: ${assessmentData.phone}

ASSESSMENT RESULTS:
Overall Score: ${assessmentData.totalScore}/90
Level: ${assessmentData.level}

PILLAR BREAKDOWN:
- Thinking Far: ${assessmentData.pillarScores['Thinking Far']}/30 (${Math.round((assessmentData.pillarScores['Thinking Far'] / 30) * 100)}%)
- Thinking Big: ${assessmentData.pillarScores['Thinking Big']}/30 (${Math.round((assessmentData.pillarScores['Thinking Big'] / 30) * 100)}%)
- Thinking Different: ${assessmentData.pillarScores['Thinking Different']}/30 (${Math.round((assessmentData.pillarScores['Thinking Different'] / 30) * 100)}%)

DETAILED RESPONSES:
${Object.entries(assessmentData.answers).map(([qNum, value]) => {
  const questionNum = parseInt(qNum) + 1;
  const pillar = pillarMapping[parseInt(qNum)];
  const answer = ['', 'Strongly Disagree', 'Disagree', 'Neutral/Sometimes', 'Agree', 'Strongly Agree'][value];
  return `Q${questionNum} (${pillar}): ${answer} (${value})`;
}).join('\n')}

---
NEXT STEPS:
1. Review the assessment results above
2. Prepare personalized recommendations based on the pillar scores
3. Compile the full report with insights
4. Email the customized report to: ${assessmentData.email}
---

FULL ASSESSMENT DATA (JSON format - for reference):
${JSON.stringify(assessmentData, null, 2)}
  `;

  // Send email using SendGrid
  try {
    const sgResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: 'krishnaswamy.subramanian@effilor.com' }],
          subject: `New Strategic Thinking Assessment - ${name} (${company})`
        }],
        from: {
          email: 'krishnaswamy.subramanian@effilor.com',
          name: 'Effilor Strategic Thinking Assessment'
        },
        content: [{
          type: 'text/plain',
          value: emailBody
        }]
      })
    });

    if (!sgResponse.ok) {
      const errorText = await sgResponse.text();
      console.error('SendGrid error:', errorText);
      return res.status(500).json({ error: 'Failed to send notification', details: errorText });
    }

    return res.status(200).json({ 
      success: true,
      message: 'Assessment submitted successfully'
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}


