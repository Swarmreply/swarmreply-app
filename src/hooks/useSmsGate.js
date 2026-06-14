// ============================================
// useSmsGate — reads the backend SMS launch gate.
// While SMS is gated (pre-A2P-approval), texting is disabled app-wide
// and "coming soon" banners are shown. Fails safe to GATED.
// ============================================
import { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

export function useSmsGate() {
  const [state, setState] = useState({ loading: true, enabled: false, liveDate: '' });

  useEffect(() => {
    let alive = true;
    axios.get(`${API}/sms/status`)
      .then(res => {
        if (alive) setState({
          loading: false,
          enabled: !!(res.data && res.data.enabled),
          liveDate: (res.data && res.data.liveDate) || ''
        });
      })
      .catch(() => { if (alive) setState({ loading: false, enabled: false, liveDate: '' }); });
    return () => { alive = false; };
  }, []);

  return state;
}

export default useSmsGate;
