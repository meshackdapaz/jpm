const serviceAccount = {
  "type": "service_account",
  "project_id": "mrmovies-63983",
  "private_key_id": "5df20dc421891eabc2a57edfb8584744a499dfda",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDTbSDLkC+9zCXG\nZf7CX+bTWagDGyeJVCIZXaVwV99DoKZoqjvtQqnG3BOYljPzmAPhpN8NSDlM268x\nZ3dazOMMEroPWncT61kVojLZj/s3cZu9SOqX10VP/8oMbI4Hp7Ln05OyB8ZXylv1\n5j3dLAnGQsTpJ/VSTPOA3dKhDqMBMrKtcBS7FITLa32o12i4ad8/BLBDGZ2hyqAR\nehcEjQF0FrIfS2t0wbYTIhTr1Bc2MrSYoK6HXDaLuBdiYVPlkTOAMTmnVnDSec49\nzsszLUtTjJyfbzoW3TOXkNOR6Q2lyitKu5I/KKm20H/+i1QsVD5y0o8EWKiasdrp\nJquQLc8tAgMBAAECggEAKFGIfkFUFV/zuTK0ozkaIeZYT6VTRBFHAmrVFIgxU6p0\naYPDM1Lx4PIRi5jjNdogrVxdS+Fgyfsf3O5D+M0XJDODB1ADYslP/vvkMhCOwes4\nnZ9k20lqVp/rFjTyXdvZVnPG1927MX0tzcYXOJEAGS6c8fCUjBoQGpxSoTOTGrRJ\nWMKfBRvViMaRfzwUn8r5B0slDh1k+yhXMnesbK0OEFtp+pIMv1jQkEwicO3mrHBp\nXXGVSa98Bvj8cnOrQBgEC6iKNZo5YssJPeuXIkMibJG/F77c9qWxIe1RAkgbh1qY\nJw5/QvW3nqvZfWQeKR87DavrCGlLO2utBDkddGZpmQKBgQDrsWcUeZs7cDnD4G7W\nWPDhcaHpzg6vktN0BbKAEzT3hYQPU3axtWnR17+z15+EZjYaiPy/0kqWn66WRSuL\nzynmuUzYFHxrdCrjpJ8cjscqRZuimsht2yBzd764SEcGxwSiWd0Gs+yUkLW//4/J\nQ+wEsfaxuEn7Mwt0FOCfIBWuaQKBgQDlpHvBT07xn1IlU4RIshoRjFi52BujNHL+\naYvfI/2ASImgX9SDpFL2QAzuhxiyvVMIF5luCJST4jRmGj4hMkgPNvojNUiU+AuI\n2zLIzDlWdNUe4PRa4FyMWW6g/i3KeY8n3ZiiA+9tCAEcgXODtpFC1bJLMhEsZju/\n4QRUAe+KJQKBgQDDBaPZmVYNNKtXnNmZmzaWFMR5Bfu447D8C8rLlxj4xw2i8NkB\n6q6I6BDD6uMfVsPl6PvabVMylyaLSOjjYqO1OhaPpUPeVd03R/wwUSQTok1JmvHF\nlM+hO7AgJA5BWWRIQjtVVIOp2qPJHtoHG6CrseYC4A63QGF1x+ClSpMmIQKBgQC2\nCJKJA8MCSVame/OKZJPBgUz71FDkKDlXbncPpMnYHKfr1srwpxuUU+VsVu6/ENB2\nw649yNNt/oumu/qv+dmhJeVWb3Bfldge3hL9lNWGsQoXdh58wwjZwDKvr4zAyWcv\nJLtPAmuSNBwdaogUym2PWzH/5Wozlb6bNVVm+jnVeQKBgCi7QTnfnK7Shzfm2P0R\nSx5OysQJG+9UKoJ6HXJ+zW2Z35+QaVpDeaEW5dxVRfCTBO9QR4qZjfZ1k1DIAztP\nG8HXf3NR7+PKkuvs76TJQUwPslu9Su0gOuWRjvdwNDVA7q8qpFDljGyqeqH+NSQV\n84WseVbjgPpJZVVoDzbaIr6s\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-8ib3l@mrmovies-63983.iam.gserviceaccount.com",
  "token_uri": "https://oauth2.googleapis.com/token"
};

async function signJwt(header, claimSet, privateKeyPem) {
  const enc = new TextEncoder();
  const base64url = (str) => btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const bufferToString = (buf) => { let r=""; for(let i=0;i<buf.length;i++) r+=String.fromCharCode(buf[i]); return r; }
  const toBase64Url = (obj) => base64url(bufferToString(enc.encode(JSON.stringify(obj))));
  const encodedHeader = toBase64Url(header);
  const encodedClaimSet = toBase64Url(claimSet);
  const sigInput = `${encodedHeader}.${encodedClaimSet}`;
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKeyPem.substring(privateKeyPem.indexOf(pemHeader)+pemHeader.length, privateKeyPem.indexOf(pemFooter)).replace(/\s/g,'');
  const binaryDer = Uint8Array.from(atob(pemContents),(c)=>c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey("pkcs8", binaryDer.buffer, {name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"}, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, enc.encode(sigInput));
  return `${sigInput}.${base64url(bufferToString(new Uint8Array(signature)))}`;
}

async function getFirebaseAccessToken() {
  const now = Math.floor(Date.now()/1000);
  const jwt = await signJwt(
    {alg:"RS256",typ:"JWT"},
    {iss:serviceAccount.client_email, scope:"https://www.googleapis.com/auth/firebase.messaging", aud:serviceAccount.token_uri, exp:now+3600, iat:now},
    serviceAccount.private_key
  );
  const res = await fetch(serviceAccount.token_uri, {
    method:"POST",
    headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body: new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer", assertion:jwt})
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data.access_token;
}

module.exports = async function(request) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') return new Response(null, {status:204, headers:cors});

  try {
    const { fcm_token, title, body, data, channel_id, type } = await request.json();
    if (!fcm_token) return new Response(JSON.stringify({error:"No fcm_token"}), {status:400, headers:cors});

    const accessToken = await getFirebaseAccessToken();

    // Use "calls" channel for calls (max importance, rings), "messages" for messages (high importance)
    const channelId = channel_id || (type === 'call' ? 'calls' : 'messages');

    const fcmPayload = {
      message: {
        token: fcm_token,
        notification: {
          title: title || "Notification",
          body: body || ""
        },
        android: {
          priority: "high",
          notification: {
            channelId: channelId,
            sound: "default",
            // PRIORITY_MAX = show as heads-up popup that covers screen
            notificationPriority: "PRIORITY_MAX",
            visibility: "PUBLIC",
            // For calls: also vibrate
            defaultVibrateTimings: type === 'call',
            defaultSound: true,
          }
        },
        apns: {
          payload: {
            aps: {
              alert: { title: title || "Notification", body: body || "" },
              sound: "default",
              badge: 1,
              "content-available": 1,
            }
          }
        },
        data: data ? Object.fromEntries(Object.entries(data).map(([k,v])=>[k,String(v)])) : {}
      }
    };

    const fcmRes = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(fcmPayload)
    });

    const fcmResult = await fcmRes.json();
    return new Response(JSON.stringify({success: true, result: fcmResult}), {
      status: 200,
      headers: {...cors, 'Content-Type':'application/json'}
    });

  } catch (err) {
    return new Response(JSON.stringify({error: String(err)}), {
      status: 500,
      headers: {...cors, 'Content-Type':'application/json'}
    });
  }
}
