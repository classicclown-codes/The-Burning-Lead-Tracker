import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  Check,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Clock3,
  ListTodo,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const STAGES = [
  { id: 'new_dms', label: 'New DMs' },
  { id: 'qualifying', label: 'Qualifying' },
  { id: 'call_booked', label: 'Call Booked' },
  { id: 'follow_up', label: 'Follow-Up' },
  { id: 'closed', label: 'Closed' },
];

const STAGE_LABELS = Object.fromEntries(STAGES.map((stage) => [stage.id, stage.label]));

const emptyLead = {
  full_name: '',
  whatsapp: '',
  business_type: '',
  city: '',
  monthly_revenue: '',
  monthly_ad_spend: '',
  goal: '',
};

const intakeInitialState = {
  full_name: '',
  whatsapp: '',
  business_type: '',
  city: '',
  monthly_revenue: '',
  monthly_ad_spend: '',
  main_objection: '',
  goal: '',
};

const badgeStyles = {
  New: 'bg-emerald-50 text-brand thin-border border-emerald-100',
  Active: 'bg-emerald-50 text-brand thin-border border-emerald-100',
  'Follow up': 'bg-amber-50 text-amber-700 thin-border border-amber-100',
  Overdue: 'bg-red-50 text-red-700 thin-border border-red-100',
  Upcoming: 'bg-emerald-50 text-brand thin-border border-emerald-100',
  Won: 'bg-emerald-50 text-brand thin-border border-emerald-100',
  Lost: 'bg-gray-100 text-gray-600 thin-border border-gray-200',
};

const INTAKE_URL = 'https://the-burning-lead-tracker.vercel.app/intake';

const WHATSAPP_SCRIPTS = [
  {
    id: 'send_form',
    label: 'Copy form link',
    stages: ['new_dms'],
    getText: (lead) => `Hey ${lead.full_name || '[Name]'} - before I check if this is a fit, fill this quick 60-second form:

${INTAKE_URL}

It helps me understand your business so I'm not wasting your time on the call.

Once done, reply "submitted" here and I'll take a look.`,
  },
  {
    id: 'form_nudge',
    label: 'Copy form nudge',
    stages: ['new_dms'],
    getText: (lead) => `Hey ${lead.full_name || '[Name]'} - just making sure you got the link. Only takes 60 seconds. Once you're done just reply "submitted" and I'll review your details.`,
  },
  {
    id: 'form_review',
    label: 'Copy form review',
    stages: ['new_dms', 'qualifying'],
    getText: (lead) => `Got it ${lead.full_name || '[Name]'} - I've gone through your details.

You're running a ${lead.business_type || '[business type]'}, currently doing ${lead.monthly_revenue || '[monthly revenue]'}, spending ${lead.monthly_ad_spend || '[monthly ad spend]'} on ads, and the problem is ${lead.main_objection || '[their stated problem]'}.

That's a pattern I recognise immediately. The right people exist in your market - they're just not seeing you yet. That's exactly what The Burning Lead system fixes.

I want to show you specifically how it would work for your business. Let's get 15 minutes on a call.`,
  },
  {
    id: 'booking_ask',
    label: 'Copy booking ask',
    stages: ['qualifying'],
    getText: () => `I have a few spots open this week. Are you available Tuesday or Thursday?`,
  },
  {
    id: 'follow_up',
    label: 'Copy follow-up',
    stages: ['qualifying', 'call_booked', 'follow_up'],
    getText: (lead) => `Hey ${lead.full_name || '[Name]'} - still here whenever you're ready. No rush.`,
  },
  {
    id: 'fresh_result',
    label: 'Copy fresh result',
    stages: ['qualifying', 'follow_up'],
    getText: (lead) => `Quick one ${lead.full_name || '[Name]'} - I was reviewing a campaign for a ${lead.business_type || '[their business type]'} this week and got a result I thought you'd want to hear about. Want me to share it?`,
  },
  {
    id: 'call_reminder',
    label: 'Copy call reminder',
    stages: ['call_booked'],
    getText: (lead) => `Hey ${lead.full_name || '[Name]'} - quick reminder for our call${lead.call_date ? ` at ${formatDateTime(lead.call_date)}` : ''}. All you need to do is show up - I'll handle the rest.`,
  },
  {
    id: 'no_show',
    label: 'Copy no-show',
    stages: ['call_booked', 'follow_up'],
    getText: (lead) => `Hey ${lead.full_name || '[Name]'} - I was on the call just now waiting for you. No worries at all - things come up.

Want to reschedule? I have a couple of spots left this week.`,
  },
  {
    id: 'close',
    label: 'Copy close',
    stages: ['follow_up', 'closed'],
    getText: (lead) => `Hey ${lead.full_name || '[Name]'} - great speaking with you. I've been thinking about what you shared.

You mentioned ${lead.main_objection || '[their specific problem]'}. That's exactly the gap The Burning Lead system closes.

Here's what I'd build for you:
- Identify your Burning Lead profile
- Build the ad and content system around them
- Run and optimise until your DMs are full of buyers

Timeline: 90 days. You mentioned you want ${lead.goal || '[their stated goal]'} - this is the path to get there.

I have one spot open this week. Are you ready to move forward?`,
  },
  {
    id: 'revive',
    label: 'Copy revive',
    stages: ['closed', 'follow_up'],
    getText: (lead) => `${lead.full_name || '[Name]'}, I won't keep following up after this - I respect your time.

But I'll be honest: what you described in the form is a real problem with a real fix. Most business owners stay stuck on it for years when they don't have to.

If the timing is ever right, the door is open.`,
  },
];

const CALL_GUIDE_SCRIPTS = [
  {
    id: 'call_opener',
    label: 'Copy call opener',
    getText: (lead) => `${lead.full_name || '[Name]'}, good to have you on. I went through what you shared in the form before this call - you mentioned ${lead.main_objection || '[their stated problem]'}. I want to make sure I fully understand that before we go any further. Does that still feel like the core issue?`,
  },
  {
    id: 'diagnose',
    label: 'Copy diagnose prompts',
    getText: (lead) => `You're spending ${lead.monthly_ad_spend || '[monthly ad spend]'} on ads every month, and the people who actually pay aren't showing up.

What do you think that's been costing you - in actual naira, every month this continues?

How long has this been going on?

Have you tried to fix it before? What happened?`,
  },
  {
    id: 'consequence',
    label: 'Copy consequence',
    getText: (lead) => `You shared in the form that your goal is ${lead.goal || '[their 90-day goal]'}.

If nothing changes over the next 6 months - same ads, same results - where does that leave you and that goal?`,
  },
  {
    id: 'three_x',
    label: 'Copy 3x frame',
    getText: () => `What if you could get at least 3x back on every naira you put into ads - and the right buyers started coming to you instead of you chasing them?

And you could do that without spending your whole day trying to figure out what to post?`,
  },
  {
    id: 'offer',
    label: 'Copy offer frame',
    getText: (lead) => `Here's what working together looks like.

We build your Burning Lead system over 90 days - we identify exactly who your Burning Lead is, build the content and ads that speak only to them, and optimise until your DMs are full of people ready to pay.

Investment is [X]. Based on your numbers, you'd need [Z] new clients to 3x that. We've done it. Let's do it for you.`,
  },
  {
    id: 'commitment',
    label: 'Copy commitment ask',
    getText: (lead) => `Based on everything - your goal of ${lead.goal || '[their 90-day goal]'}, the system, and what we've done for others - are you ready to move forward and get this built for your business?`,
  },
];

function timeAgo(value) {
  if (!value) return 'No contact';
  const then = new Date(value).getTime();
  const diff = Date.now() - then;
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day' : `${days} days`;
}

function daysSince(value) {
  if (!value) return 999;
  return (Date.now() - new Date(value).getTime()) / 86400000;
}

function isThisMonth(value) {
  const date = new Date(value);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function isFollowUpDue(lead) {
  return lead.stage !== 'closed' && daysSince(lead.last_contact) >= 1;
}

function isUpcomingCall(lead) {
  return lead.stage === 'call_booked' && lead.call_date && new Date(lead.call_date) > new Date();
}

function getTodayReason(lead) {
  const badge = getBadge(lead);
  if (badge === 'Overdue') return 'Overdue';
  if (isFollowUpDue(lead)) return 'Follow-up due';
  if (isUpcomingCall(lead)) return 'Upcoming call';
  return '';
}

function getBadge(lead) {
  if (lead.stage === 'closed' && lead.outcome === 'won') return 'Won';
  if (lead.stage === 'closed' && lead.outcome === 'lost') return 'Lost';
  if (isUpcomingCall(lead)) return 'Upcoming';
  if (lead.stage === 'new_dms') return 'New';
  const age = daysSince(lead.last_contact);
  if (age < 1) return 'Active';
  if (age < 3) return 'Follow up';
  return 'Overdue';
}

function formatDateTime(value) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function toLocalInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function waLink(number) {
  const cleaned = String(number || '').replace(/\D/g, '');
  return cleaned ? `https://wa.me/${cleaned}` : '#';
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function AuthScreen() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const action = isSignup
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password });
    const { error } = await action;
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(isSignup ? 'Check your inbox if email confirmation is enabled.' : '');
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="min-h-screen bg-white px-5 py-10">
        <section className="mx-auto max-w-xl thin-border rounded-lg p-6">
          <h1 className="text-2xl font-bold">Burning Lead Tracker</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Add your Supabase project URL and anon key to a local <span className="font-medium text-ink">.env</span> file, then run the SQL in
            <span className="font-medium text-ink"> supabase/schema.sql</span>.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#F7F8F7] px-5 py-10">
      <section className="w-full max-w-md rounded-lg bg-white p-6 thin-border">
        <div className="mb-8">
          <p className="text-sm font-semibold text-brand">Burning Lead Tracker</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{isSignup ? 'Create your account' : 'Welcome back'}</h1>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input className="mt-2 w-full rounded-md border-0 thin-border px-3 py-3 outline-none focus:ring-2 focus:ring-brand/20" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Password</span>
            <input className="mt-2 w-full rounded-md border-0 thin-border px-3 py-3 outline-none focus:ring-2 focus:ring-brand/20" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} />
          </label>
          {message && <p className="text-sm text-gray-600">{message}</p>}
          <button className="w-full rounded-md bg-brand px-4 py-3 font-semibold text-white transition hover:bg-brand/90 disabled:opacity-60" disabled={loading}>
            {loading ? 'Working...' : isSignup ? 'Sign up' : 'Log in'}
          </button>
        </form>
        <button className="mt-5 w-full text-sm font-medium text-brand" onClick={() => setIsSignup((value) => !value)}>
          {isSignup ? 'Already have an account? Log in' : 'Need an account? Sign up'}
        </button>
      </section>
    </main>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="min-w-0 rounded-lg bg-white px-3 py-3 thin-border sm:px-4 sm:py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <div className="mt-2 flex min-w-0 flex-wrap items-end gap-x-2 gap-y-1">
        <p className="text-xl font-bold sm:text-2xl">{value}</p>
        {sub && <p className="pb-0.5 text-xs text-gray-500 sm:text-sm">{sub}</p>}
      </div>
    </div>
  );
}

function LeadCard({ lead, onOpen, onPrimary, reason }) {
  const badge = getBadge(lead);
  const latestNote = lead.notes?.[0]?.content || 'No notes yet';
  const primaryLabel = lead.stage === 'new_dms' ? 'Reply' : 'Move';

  return (
    <article className="rounded-lg bg-white p-4 thin-border transition hover:border-brand/50" onClick={() => onOpen(lead)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{lead.full_name}</h3>
          <p className="mt-1 truncate text-sm text-gray-500">{lead.business_type || 'Business type not set'}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${badgeStyles[badge]}`}>{badge}</span>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
        <Clock3 size={14} />
        <span>{timeAgo(lead.last_contact)}</span>
      </div>
      {reason && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#F7F8F7] px-2.5 py-1 text-xs font-semibold text-gray-600 thin-border">
          {reason === 'Upcoming call' ? <CalendarClock size={13} /> : <ListTodo size={13} />}
          {reason}
        </div>
      )}
      <p className="mt-3 truncate text-sm text-gray-600">{latestNote}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button className="inline-flex items-center justify-center gap-1 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white" onClick={(event) => { event.stopPropagation(); onPrimary(lead); }}>
          {primaryLabel}
          {lead.stage !== 'new_dms' && <ArrowRight size={15} />}
        </button>
        <button className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-ink thin-border" onClick={(event) => { event.stopPropagation(); onOpen(lead); }}>
          View
        </button>
      </div>
    </article>
  );
}

function AddLeadModal({ onClose, onCreate }) {
  const [form, setForm] = useState(emptyLead);
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    await onCreate(form);
    setLoading(false);
  }

  return (
    <Modal title="Add lead" onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <FormInput label="Full name" value={form.full_name} onChange={(value) => setForm({ ...form, full_name: value })} required />
        <FormInput label="WhatsApp number" value={form.whatsapp} onChange={(value) => setForm({ ...form, whatsapp: value })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput label="Business type" value={form.business_type} onChange={(value) => setForm({ ...form, business_type: value })} />
          <FormInput label="City" value={form.city} onChange={(value) => setForm({ ...form, city: value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput label="Monthly revenue" value={form.monthly_revenue} onChange={(value) => setForm({ ...form, monthly_revenue: value })} />
          <FormInput label="Monthly ad spend" value={form.monthly_ad_spend} onChange={(value) => setForm({ ...form, monthly_ad_spend: value })} />
        </div>
        <FormInput label="Goal" value={form.goal} onChange={(value) => setForm({ ...form, goal: value })} />
        <button className="w-full rounded-md bg-brand px-4 py-3 font-semibold text-white disabled:opacity-60" disabled={loading}>{loading ? 'Adding...' : 'Add lead'}</button>
      </form>
    </Modal>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/20 px-0 py-0 sm:place-items-center sm:px-4 sm:py-6">
      <section className="max-h-[96vh] w-full max-w-xl overflow-auto rounded-t-lg bg-white p-4 shadow-panel sm:max-h-[92vh] sm:rounded-lg sm:p-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="min-w-0 pr-3 text-lg font-bold">{title}</h2>
          <button className="grid h-9 w-9 place-items-center rounded-md thin-border" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function FormInput({ label, value, onChange, required, type = 'text' }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input className="mt-2 w-full rounded-md border-0 thin-border px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand/20" type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

function IntakePage() {
  const [form, setForm] = useState(intakeInitialState);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const source = new URLSearchParams(window.location.search).get('source') || 'WhatsApp ad DM';

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setStatus('loading');
    setMessage('');

    if (!isSupabaseConfigured) {
      setStatus('error');
      setMessage('Lead intake is not configured yet.');
      return;
    }

    const { error } = await supabase.functions.invoke('create-lead', {
      body: { ...form, source },
    });

    if (error) {
      setStatus('error');
      setMessage(error.message || 'Something went wrong. Please message us on WhatsApp.');
      return;
    }

    setStatus('success');
    setMessage('Done. Your details are in. Go back to WhatsApp and send "submitted" so we can continue.');
    setForm(intakeInitialState);
  }

  return (
    <main className="min-h-screen bg-[#F7F8F7] px-4 py-5 sm:px-6 sm:py-8">
      <section className="mx-auto max-w-2xl">
        <div className="mb-4 rounded-lg bg-white p-4 thin-border sm:mb-5 sm:p-5">
          <p className="text-sm font-bold text-brand">The Burning Lead</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Quick business check</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Fill this in before we continue on WhatsApp. It helps us see if the system is actually right for your business.
          </p>
        </div>

        {status === 'success' ? (
          <div className="rounded-lg bg-white p-6 thin-border">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-brand thin-border">
              <Check size={22} />
            </div>
            <h2 className="mt-4 text-2xl font-bold">Submitted</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">{message}</p>
            <button className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-3 text-sm font-bold text-white sm:w-auto" onClick={() => window.history.back()}>
              <MessageCircle size={18} />
              Back to WhatsApp
            </button>
          </div>
        ) : (
          <form className="space-y-4 rounded-lg bg-white p-4 thin-border sm:p-5" onSubmit={submit}>
            <FormInput label="Full name" value={form.full_name} onChange={(value) => updateField('full_name', value)} required />
            <FormInput label="WhatsApp number" value={form.whatsapp} onChange={(value) => updateField('whatsapp', value)} required />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput label="Business type" value={form.business_type} onChange={(value) => updateField('business_type', value)} required />
              <FormInput label="City" value={form.city} onChange={(value) => updateField('city', value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput label="Monthly revenue" value={form.monthly_revenue} onChange={(value) => updateField('monthly_revenue', value)} />
              <FormInput label="Monthly ad spend" value={form.monthly_ad_spend} onChange={(value) => updateField('monthly_ad_spend', value)} />
            </div>
            <label className="block">
              <span className="text-sm font-medium">Biggest problem getting paying clients</span>
              <textarea className="mt-2 min-h-28 w-full resize-none rounded-md border-0 thin-border px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand/20" value={form.main_objection} onChange={(event) => updateField('main_objection', event.target.value)} required />
            </label>
            <label className="block">
              <span className="text-sm font-medium">What do you want to achieve in 90 days?</span>
              <textarea className="mt-2 min-h-28 w-full resize-none rounded-md border-0 thin-border px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand/20" value={form.goal} onChange={(event) => updateField('goal', event.target.value)} required />
            </label>
            {message && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 thin-border">{message}</p>}
            <button className="w-full rounded-md bg-brand px-4 py-3.5 text-sm font-bold text-white disabled:opacity-60" disabled={status === 'loading'}>
              {status === 'loading' ? 'Submitting...' : 'Submit details'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

function DetailPanel({ lead, onClose, onUpdate, onMove, onAddNote, onDelete }) {
  const [draft, setDraft] = useState(lead);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    setDraft(lead);
    setNote('');
    setNoteOpen(false);
    setCopied('');
  }, [lead]);

  const currentIndex = STAGES.findIndex((stage) => stage.id === lead.stage);
  const isLost = lead.stage === 'closed' && lead.outcome === 'lost';

  async function saveField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    await onUpdate(lead.id, { [field]: value });
  }

  async function submitNote() {
    if (!note.trim()) return;
    await onAddNote(lead.id, note.trim());
    setNote('');
    setNoteOpen(false);
  }

  async function copyScript(script) {
    await copyText(script.getText(lead));
    setCopied(script.id);
    window.setTimeout(() => setCopied(''), 1600);
  }

  return (
    <aside className="fixed inset-0 z-40 flex w-full flex-col bg-white shadow-panel sm:inset-y-0 sm:left-auto sm:right-0 sm:max-w-xl sm:border-l sm:border-line">
      <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5 sm:py-4">
        <div className="min-w-0 pr-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">{STAGE_LABELS[lead.stage]}</p>
          <h2 className="truncate text-lg font-bold sm:text-xl">{lead.full_name}</h2>
        </div>
        <button className="grid h-10 w-10 shrink-0 place-items-center rounded-md thin-border" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <div className="scrollbar-soft flex-1 overflow-auto px-4 py-4 sm:px-5 sm:py-5">
        <div className="mb-6 grid grid-cols-5 gap-1">
          {STAGES.map((stage, index) => (
            <div key={stage.id} className={`h-2 rounded-full ${index <= currentIndex ? 'bg-brand' : 'bg-gray-200'}`} title={stage.label} />
          ))}
        </div>

        <section className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput label="Full name" value={draft.full_name} onChange={(value) => saveField('full_name', value)} />
            <FormInput label="Business type" value={draft.business_type} onChange={(value) => saveField('business_type', value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput label="City" value={draft.city} onChange={(value) => saveField('city', value)} />
            <label className="block">
              <span className="text-sm font-medium">WhatsApp number</span>
              <div className="mt-2 flex gap-2">
                <input className="min-w-0 flex-1 rounded-md border-0 thin-border px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand/20" value={draft.whatsapp || ''} onChange={(event) => saveField('whatsapp', event.target.value)} />
                <a className="grid h-[42px] w-[42px] place-items-center rounded-md bg-brand text-white" href={waLink(draft.whatsapp)} target="_blank" rel="noreferrer" aria-label="Open WhatsApp">
                  <MessageCircle size={18} />
                </a>
              </div>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput label="Monthly revenue" value={draft.monthly_revenue} onChange={(value) => saveField('monthly_revenue', value)} />
            <FormInput label="Monthly ad spend" value={draft.monthly_ad_spend} onChange={(value) => saveField('monthly_ad_spend', value)} />
          </div>
          <FormInput label="Main objection" value={draft.main_objection} onChange={(value) => saveField('main_objection', value)} />
          <label className="block">
            <span className="text-sm font-medium">Goal</span>
            <textarea className="mt-2 min-h-24 w-full resize-none rounded-md border-0 thin-border px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand/20" value={draft.goal || ''} onChange={(event) => saveField('goal', event.target.value)} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Info label="Last contact" value={formatDateTime(lead.last_contact)} />
            <Info label="Call date" value={formatDateTime(lead.call_date)} />
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-bold">WhatsApp scripts</h3>
            {copied && <span className="text-xs font-semibold text-brand">Copied</span>}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {WHATSAPP_SCRIPTS
              .filter((script) => script.stages.includes(lead.stage))
              .map((script) => (
                <button
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 py-2 text-center text-sm font-semibold thin-border ${copied === script.id ? 'border-brand bg-emerald-50 text-brand' : 'bg-white text-ink'}`}
                  key={script.id}
                  onClick={() => copyScript(script)}
                >
                  {copied === script.id ? <ClipboardCheck size={16} /> : <Copy size={16} />}
                  <span>{script.label}</span>
                </button>
            ))}
          </div>
        </section>

        {['call_booked', 'follow_up', 'closed'].includes(lead.stage) && (
          <section className="mt-8 rounded-lg bg-[#F7F8F7] p-4 thin-border">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold">Call guide</h3>
                <p className="mt-1 text-xs text-gray-500">Use the form data. Do not ask what the CRM already knows.</p>
              </div>
              <CalendarClock className="text-brand" size={18} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {CALL_GUIDE_SCRIPTS.map((script) => (
                <button
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-white px-3 py-2 text-center text-sm font-semibold thin-border ${copied === script.id ? 'border-brand bg-emerald-50 text-brand' : 'text-ink'}`}
                  key={script.id}
                  onClick={() => copyScript(script)}
                >
                  {copied === script.id ? <ClipboardCheck size={16} /> : <Copy size={16} />}
                  <span>{script.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-2 text-sm text-gray-600">
              <p><span className="font-semibold text-ink">Promise:</span> 3x return, then over-deliver.</p>
              <p><span className="font-semibold text-ink">Pain stack:</span> money, time, emotion, consequence.</p>
              <p><span className="font-semibold text-ink">Close:</span> ask once, then let the silence work.</p>
            </div>
          </section>
        )}

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">Notes</h3>
            <button className="rounded-md bg-white px-3 py-2 text-sm font-semibold thin-border" onClick={() => setNoteOpen((value) => !value)}>Add note</button>
          </div>
          {noteOpen && (
            <div className="mb-4 rounded-lg bg-[#F7F8F7] p-3 thin-border">
              <textarea className="min-h-24 w-full resize-none rounded-md border-0 bg-white px-3 py-2.5 thin-border outline-none focus:ring-2 focus:ring-brand/20" value={note} onChange={(event) => setNote(event.target.value)} autoFocus />
              <button className="mt-3 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white" onClick={submitNote}>Save note</button>
            </div>
          )}
          <div className="space-y-3">
            {lead.notes?.length ? lead.notes.map((entry) => (
              <article className="rounded-lg bg-white p-3 thin-border" key={entry.id}>
                <p className="text-sm leading-6 text-gray-700">{entry.content}</p>
                <p className="mt-2 text-xs text-gray-400">{formatDateTime(entry.created_at)}</p>
              </article>
            )) : <p className="rounded-lg bg-[#F7F8F7] p-4 text-sm text-gray-500 thin-border">No notes yet.</p>}
          </div>
        </section>
      </div>

      <div className="border-t border-line bg-white p-3 sm:p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {lead.stage !== 'closed' && <ActionButton icon={ChevronRight} label="Move next" onClick={() => onMove(lead)} primary />}
          <ActionButton icon={Clock3} label="Log follow-up" onClick={() => onUpdate(lead.id, { last_contact: new Date().toISOString() })} />
          {lead.stage === 'closed' && <ActionButton icon={Check} label="Won" onClick={() => onUpdate(lead.id, { outcome: 'won' })} />}
          {lead.stage === 'closed' && <ActionButton icon={X} label="Lost" onClick={() => onUpdate(lead.id, { outcome: 'lost' })} />}
          {isLost && <ActionButton icon={ArrowRight} label="Revive" onClick={() => onUpdate(lead.id, { stage: 'follow_up', outcome: null })} primary />}
          <ActionButton icon={Trash2} label="Delete" danger onClick={() => onDelete(lead)} />
        </div>
      </div>
    </aside>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg bg-[#F7F8F7] p-3 thin-border">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, primary, danger }) {
  return (
    <button className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-2.5 py-2 text-center text-xs font-semibold thin-border sm:gap-2 sm:px-3 sm:text-sm ${primary ? 'border-brand bg-brand text-white' : danger ? 'bg-red-50 text-red-700' : 'bg-white text-ink'}`} onClick={onClick}>
      <Icon size={16} />
      <span>{label}</span>
    </button>
  );
}

function PromptModal({ prompt, onClose, onSubmit }) {
  const [date, setDate] = useState('');
  const [outcome, setOutcome] = useState('won');

  if (prompt.type === 'call_date') {
    return (
      <Modal title="Book call" onClose={onClose}>
        <label className="block">
          <span className="text-sm font-medium">Call date and time</span>
          <input className="mt-2 w-full rounded-md border-0 thin-border px-3 py-3 outline-none focus:ring-2 focus:ring-brand/20" type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <button className="mt-5 w-full rounded-md bg-brand px-4 py-3 font-semibold text-white" onClick={() => onSubmit({ call_date: date ? new Date(date).toISOString() : null })}>Move to Call Booked</button>
      </Modal>
    );
  }

  return (
    <Modal title="Close lead" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        {['won', 'lost'].map((value) => (
          <button key={value} className={`rounded-md px-4 py-3 text-sm font-semibold capitalize thin-border ${outcome === value ? 'border-brand bg-emerald-50 text-brand' : 'bg-white'}`} onClick={() => setOutcome(value)}>
            {value}
          </button>
        ))}
      </div>
      <button className="mt-5 w-full rounded-md bg-brand px-4 py-3 font-semibold text-white" onClick={() => onSubmit({ outcome })}>Close lead</button>
    </Modal>
  );
}

function Dashboard({ session }) {
  const [leads, setLeads] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [prompt, setPrompt] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('pipeline');
  const [activeStage, setActiveStage] = useState('new_dms');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId);

  async function loadLeads() {
    setLoading(true);
    setError('');
    const [{ data: leadData, error: leadError }, { data: noteData, error: noteError }] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('notes').select('*').order('created_at', { ascending: false }),
    ]);
    setLoading(false);
    if (leadError || noteError) {
      setError(leadError?.message || noteError?.message);
      return;
    }
    const notesByLead = (noteData || []).reduce((acc, note) => {
      acc[note.lead_id] = acc[note.lead_id] || [];
      acc[note.lead_id].push(note);
      return acc;
    }, {});
    setLeads((leadData || []).map((lead) => ({ ...lead, notes: notesByLead[lead.id] || [] })));
  }

  useEffect(() => {
    loadLeads();
    const channel = supabase
      .channel('lead-tracker-db')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, loadLeads)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, loadLeads)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const stats = useMemo(() => {
    const monthLeads = leads.filter((lead) => isThisMonth(lead.created_at));
    const total = monthLeads.length;
    const calls = monthLeads.filter((lead) => ['call_booked', 'follow_up', 'closed'].includes(lead.stage)).length;
    const closed = monthLeads.filter((lead) => lead.stage === 'closed' && lead.outcome === 'won').length;
    return {
      total,
      calls,
      callRate: total ? Math.round((calls / total) * 100) : 0,
      closed,
      closeRate: calls ? Math.round((closed / calls) * 100) : 0,
      due: leads.filter(isFollowUpDue).length,
    };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesSearch = !query || [lead.full_name, lead.business_type].some((value) => String(value || '').toLowerCase().includes(query));
      const badge = getBadge(lead);
      const matchesFilter = filter === 'all'
        || lead.stage === filter
        || (filter === 'overdue' && badge === 'Overdue')
        || (filter === 'due_today' && isFollowUpDue(lead));
      return matchesSearch && matchesFilter;
    });
  }, [leads, search, filter]);

  const todayLeads = useMemo(() => {
    return filteredLeads
      .filter((lead) => getTodayReason(lead))
      .sort((a, b) => {
        const priority = { Overdue: 0, 'Follow-up due': 1, 'Upcoming call': 2 };
        const reasonDiff = priority[getTodayReason(a)] - priority[getTodayReason(b)];
        if (reasonDiff !== 0) return reasonDiff;
        return new Date(a.call_date || a.last_contact || a.created_at) - new Date(b.call_date || b.last_contact || b.created_at);
      });
  }, [filteredLeads]);

  async function createLead(form) {
    const { data, error: insertError } = await supabase
      .from('leads')
      .insert({
        ...form,
        user_id: session.user.id,
        stage: 'new_dms',
        last_contact: new Date().toISOString(),
      })
      .select()
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setLeads((current) => [{ ...data, notes: [] }, ...current]);
    setAddOpen(false);
  }

  async function updateLead(id, patch) {
    const { data, error: updateError } = await supabase.from('leads').update(patch).eq('id', id).select().single();
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, ...data, notes: lead.notes || [] } : lead)));
  }

  async function addNote(leadId, content) {
    const { data, error: noteError } = await supabase.from('notes').insert({ lead_id: leadId, content }).select().single();
    if (noteError) {
      setError(noteError.message);
      return;
    }
    setLeads((current) => current.map((lead) => (
      lead.id === leadId ? { ...lead, notes: [data, ...(lead.notes || [])] } : lead
    )));
  }

  async function deleteLead(lead) {
    if (!window.confirm(`Delete ${lead.full_name}?`)) return;
    const { error: deleteError } = await supabase.from('leads').delete().eq('id', lead.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setLeads((current) => current.filter((item) => item.id !== lead.id));
    setSelectedLeadId(null);
  }

  function moveLead(lead) {
    if (lead.stage === 'closed') return;
    const index = STAGES.findIndex((stage) => stage.id === lead.stage);
    const nextStage = STAGES[index + 1]?.id;
    if (!nextStage) return;
    if (nextStage === 'call_booked') {
      setPrompt({ type: 'call_date', lead, nextStage });
      return;
    }
    if (nextStage === 'closed') {
      setPrompt({ type: 'outcome', lead, nextStage });
      return;
    }
    updateLead(lead.id, { stage: nextStage, outcome: null });
  }

  async function finishPrompt(values) {
    await updateLead(prompt.lead.id, { stage: prompt.nextStage, outcome: null, ...values });
    setPrompt(null);
  }

  function primaryAction(lead) {
    if (lead.stage === 'new_dms') {
      window.open(waLink(lead.whatsapp), '_blank', 'noopener,noreferrer');
      return;
    }
    moveLead(lead);
  }

  return (
    <main className="min-h-screen bg-[#F7F8F7]">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-3 py-3 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">Burning Lead Tracker</h1>
            <p className="mt-1 text-sm text-gray-500">WhatsApp DM to closed client pipeline</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand px-3 py-2.5 text-sm font-semibold text-white sm:px-4" onClick={() => setAddOpen(true)}>
              <Plus size={17} />
              Add lead
            </button>
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-white px-3 py-2.5 text-sm font-semibold thin-border" onClick={() => supabase.auth.signOut()}>
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-3 py-4 sm:px-6 sm:py-6">
        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 thin-border">{error}</div>}
        <section className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
          <StatCard label="Total leads this month" value={stats.total} />
          <StatCard label="Calls booked" value={stats.calls} sub={`${stats.callRate}% conversion`} />
          <StatCard label="Clients closed" value={stats.closed} sub={`${stats.closeRate}% close rate`} />
          <StatCard label="Follow-ups due today" value={stats.due} />
        </section>

        <section className="mt-4 flex flex-col gap-2 rounded-lg bg-white p-2 thin-border sm:mt-5 sm:gap-3 sm:p-3 md:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input className="min-h-11 w-full rounded-md border-0 bg-[#F7F8F7] py-3 pl-10 pr-3 text-sm thin-border outline-none focus:ring-2 focus:ring-brand/20 sm:text-base" placeholder="Search name or business type" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <select className="min-h-11 rounded-md border-0 bg-[#F7F8F7] px-3 py-3 text-sm thin-border outline-none focus:ring-2 focus:ring-brand/20 sm:text-base" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All stages</option>
            {STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
            <option value="overdue">Overdue only</option>
            <option value="due_today">Follow-ups due today</option>
          </select>
        </section>

        <section className="mt-3 flex gap-1 rounded-lg bg-white p-1 thin-border sm:mt-4 sm:gap-2">
          <button className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-bold ${view === 'pipeline' ? 'bg-brand text-white' : 'text-gray-600'}`} onClick={() => setView('pipeline')}>
            <ChevronRight size={16} />
            Pipeline
          </button>
          <button className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-bold ${view === 'today' ? 'bg-brand text-white' : 'text-gray-600'}`} onClick={() => setView('today')}>
            <ListTodo size={16} />
            Today
            <span className={`rounded-full px-2 py-0.5 text-xs ${view === 'today' ? 'bg-white/20 text-white' : 'bg-[#F7F8F7] text-gray-600 thin-border'}`}>{todayLeads.length}</span>
          </button>
        </section>

        {loading ? (
          <div className="mt-6 rounded-lg bg-white p-8 text-center text-sm text-gray-500 thin-border">Loading leads...</div>
        ) : view === 'today' ? (
          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Today</h2>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-600 thin-border">{todayLeads.length} due</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {todayLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} reason={getTodayReason(lead)} onOpen={(item) => setSelectedLeadId(item.id)} onPrimary={primaryAction} />
              ))}
              {!todayLeads.length && (
                <div className="rounded-lg bg-white p-8 text-center text-sm text-gray-500 thin-border md:col-span-2 xl:col-span-3">No urgent leads right now.</div>
              )}
            </div>
          </section>
        ) : (
          <>
            <section className="scrollbar-soft mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {STAGES.map((stage) => {
                const count = filteredLeads.filter((lead) => lead.stage === stage.id).length;
                return (
                  <button
                    className={`min-h-10 shrink-0 rounded-full px-3 py-2 text-sm font-bold thin-border sm:px-4 ${activeStage === stage.id ? 'border-brand bg-brand text-white' : 'bg-white text-gray-600'}`}
                    key={stage.id}
                    onClick={() => setActiveStage(stage.id)}
                  >
                    {stage.label}
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${activeStage === stage.id ? 'bg-white/20 text-white' : 'bg-[#F7F8F7] text-gray-600'}`}>{count}</span>
                  </button>
                );
              })}
            </section>

            <section className="scrollbar-soft mt-4 grid gap-3 pb-4 sm:gap-4 lg:mt-6 lg:grid-cols-5 lg:overflow-x-auto">
            {STAGES.map((stage) => {
              const stageLeads = filteredLeads.filter((lead) => lead.stage === stage.id);
              return (
                <div className={`min-h-[320px] rounded-lg bg-white p-3 thin-border lg:min-h-[360px] lg:min-w-[280px] ${activeStage === stage.id ? 'block' : 'hidden lg:block'}`} key={stage.id}>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-bold">{stage.label}</h2>
                    <span className="rounded-full bg-[#F7F8F7] px-2.5 py-1 text-xs font-bold text-gray-600 thin-border">{stageLeads.length}</span>
                  </div>
                  <div className="space-y-3">
                    {stageLeads.map((lead) => (
                      <LeadCard key={lead.id} lead={lead} onOpen={(item) => setSelectedLeadId(item.id)} onPrimary={primaryAction} />
                    ))}
                    {!stageLeads.length && <div className="rounded-lg bg-[#F7F8F7] p-5 text-center text-sm text-gray-500 thin-border">No leads here</div>}
                  </div>
                </div>
              );
            })}
            </section>
          </>
        )}
      </div>

      {addOpen && <AddLeadModal onClose={() => setAddOpen(false)} onCreate={createLead} />}
      {selectedLead && <DetailPanel lead={selectedLead} onClose={() => setSelectedLeadId(null)} onUpdate={updateLead} onMove={moveLead} onAddNote={addNote} onDelete={deleteLead} />}
      {prompt && <PromptModal prompt={prompt} onClose={() => setPrompt(null)} onSubmit={finishPrompt} />}
    </main>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [bootError, setBootError] = useState('');
  const isIntakeRoute = window.location.pathname === '/intake';

  useEffect(() => {
    if (!isSupabaseConfigured || isIntakeRoute) return;
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) setBootError(error.message);
        setSession(data?.session ?? null);
        setReady(true);
      })
      .catch((error) => {
        if (!mounted) return;
        setBootError(error.message || 'Supabase could not start.');
        setReady(true);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      data?.subscription?.unsubscribe();
    };
  }, [isIntakeRoute]);

  if (isIntakeRoute) {
    return <IntakePage />;
  }

  if (!ready) {
    return <main className="grid min-h-screen place-items-center bg-white text-sm text-gray-500">Loading...</main>;
  }

  if (bootError) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F7F8F7] px-5">
        <section className="w-full max-w-lg rounded-lg bg-white p-6 thin-border">
          <p className="text-sm font-semibold text-red-700">Startup error</p>
          <h1 className="mt-2 text-2xl font-bold">Supabase could not initialize</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">{bootError}</p>
        </section>
      </main>
    );
  }

  return session ? <Dashboard session={session} /> : <AuthScreen />;
}
