// ============================================
// src/pages/dashboard/surveys.js
// Legacy route. Surveys & NPS now live inside Grow.
// This page just forwards anyone with an old bookmark
// (or a stale link) to the right place.
// ============================================

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function SurveysRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/grow?tab=surveys');
  }, [router]);

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui,-apple-system,sans-serif', color: '#7a7670', fontSize: '.9rem' }}>
      Taking you to Surveys & NPS…
    </div>
  );
}
