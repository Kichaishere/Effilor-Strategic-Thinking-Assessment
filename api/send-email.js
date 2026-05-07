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

  // Calculate scores
  const pillarScores = {
    'Thinking Far': 0,
    'Thinking Big': 0,
    'Thinking Different': 0
  };

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

  let level = 'Transactional Thinking';
  if (totalScore >= 67) {
    level = 'Strategic Thinking';
  } else if (totalScore >= 43) {
    level = 'Emerging Strategic Thinking';
  }

  const assessmentData = {
    submittedAt: timestamp || new Date().toISOString(),
    name, email, company, role,
    phone: phone || 'Not provided',
    totalScore, level, pillarScores, answers
  };

  const emailBody = [
    'New Strategic Thinking Quotient Assessment Submission',
    '',
    'SUBMITTED: ' + assessmentData.submittedAt,
    '',
    'CONTACT INFORMATION:',
    'Name: ' + assessmentData.name,
    'Email: ' + assessmentData.email,
    'Company: ' + assessmentData.company,
    'Role: ' + assessmentData.role,
    'Phone: ' + assessmentData.phone,
    '',
    'ASSESSMENT RESULTS:',
    'Overall Score: ' + assessmentData.totalScore + '/90',
    'Level: ' + assessmentData.level,
    '',
    'PILLAR BREAKDOWN:',
    '- Thinking Far: ' + assessmentData.pillarScores['Thinking Far'] + '/30 (' + Math.round((assessmentData.pillarScores['Thinking Far'] / 30) * 100) + '%)',
    '- Thinking Big: ' + assessmentData.pillarScores['Thinking Big'] + '/30 (' + Math.round((assessmentData.pillarScores['Thinking Big'] / 30) * 100) + '%)',
    '- Thinking Different: ' + assessmentData.pillarScores['Thinking Different'] + '/30 (' + Math.round((assessmentData.pillarScores['Thinking Different'] / 30) * 100) + '%)',
    '',
    'DETAILED RESPONSES:',
    Object.entries(assessmentData.answers).map(function(entry) {
      var qNum = entry[0];
      var value = entry[1];
      var questionNum = parseInt(qNum) + 1;
      var pillar = pillarMapping[parseInt(qNum)];
      var answerLabels = ['', 'Strongly Disagree', 'Disagree', 'Neutral/Sometimes', 'Agree', 'Strongly Agree'];
      var answer = answerLabels[value];
      return 'Q' + questionNum + ' (' + pillar + '): ' + answer + ' (' + value + ')';
    }).join('\n'),
    '',
    '---',
    'NEXT STEPS:',
    '1. Review the assessment results above',
    '2. Prepare personalised recommendations based on the pillar scores',
    '3. Compile the full report with insights',
    '4. Email the customised report to: ' + assessmentData.email,
    '---',
    '',
    'FULL ASSESSMENT DATA (JSON):',
    JSON.stringify(assessmentData, null, 2)
  ].join('\n');

  // Send email using Sender.net
  try {
    const senderResponse = await fetch('https://api.sender.net/v2/message/send', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.SENDER_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        from: {
          email: 'skrishna.cts@gmail.com',
          name: 'Effilor STQ Assessment'
        },
        to: {
          email: 'krishnaswamy.subramanian@effilor.com',
          name: 'Krishna'
        },
        reply_to: email,
        subject: 'New STQ Assessment - ' + name + ' (' + company + ') — ' + level,
        text: emailBody
      })
    });

    if (!senderResponse.ok) {
      const errorData = await senderResponse.json().catch(function() { return {}; });
      console.error('Sender API error:', errorData);
      return res.status(500).json({ error: 'Failed to send notification', details: errorData });
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
