'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ImagePicker } from '@/components/ui/ImagePicker';

interface PaymentMethod {
  id?: string;
  type: string;
  value: string;
  enabled: boolean;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [title, setTitle] = useState('');
  const [commissioner, setCommissioner] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [nfcTeam, setNfcTeam] = useState('');
  const [nfcLogo, setNfcLogo] = useState('');
  const [afcTeam, setAfcTeam] = useState('');
  const [afcLogo, setAfcLogo] = useState('');
  const [sbLogo, setSbLogo] = useState('');
  const [betAmount, setBetAmount] = useState('10');
  const [winFirstPct, setWinFirstPct] = useState('20');
  const [winSecondPct, setWinSecondPct] = useState('20');
  const [winThirdPct, setWinThirdPct] = useState('20');
  const [winFinalPct, setWinFinalPct] = useState('30');
  const [donationPct, setDonationPct] = useState('10');
  const [graceHours, setGraceHours] = useState('48');
  const [rulesText, setRulesText] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [payments, setPayments] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        setTitle(data.title || '');
        setCommissioner(data.commissioner || '');
        setEventName(data.eventName || '');
        setEventDate(data.eventDate || '');
        setEventTime(data.eventTime || '');
        setNfcTeam(data.nfcTeam || '');
        setNfcLogo(data.nfcLogo || '');
        setAfcTeam(data.afcTeam || '');
        setAfcLogo(data.afcLogo || '');
        setSbLogo(data.sbLogo || '');
        setBetAmount(String(data.betAmount || 10));
        setWinFirstPct(String(data.winFirstPct || 20));
        setWinSecondPct(String(data.winSecondPct || 20));
        setWinThirdPct(String(data.winThirdPct || 20));
        setWinFinalPct(String(data.winFinalPct || 30));
        setDonationPct(String(data.donationPct || 10));
        setGraceHours(String(data.graceHours || 48));
        setRulesText(data.rulesText || '');
        setPaymentInstructions(data.paymentInstructions || '');
        setPayments(data.paymentMethods || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          commissioner,
          eventName,
          eventDate,
          eventTime,
          nfcTeam,
          nfcLogo,
          afcTeam,
          afcLogo,
          sbLogo,
          betAmount: parseFloat(betAmount),
          winFirstPct: parseFloat(winFirstPct),
          winSecondPct: parseFloat(winSecondPct),
          winThirdPct: parseFloat(winThirdPct),
          winFinalPct: parseFloat(winFinalPct),
          donationPct: parseFloat(donationPct),
          graceHours: parseInt(graceHours),
          rulesText,
          paymentInstructions,
          paymentMethods: payments,
        }),
      });

      if (!res.ok) throw new Error('Save failed');
      setMessage('Settings saved!');
    } catch {
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addPayment = () => {
    setPayments([...payments, { type: 'VENMO', value: '', enabled: true }]);
  };

  const removePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  if (loading) return <p className="text-gray-400">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Game Settings</h1>
        <Button onClick={handleSave} loading={saving}>
          Save Settings
        </Button>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${
          message.includes('saved') ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-lg">General</h2>
          <Input id="title" label="Page Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input id="commissioner" label="Commissioner" value={commissioner} onChange={(e) => setCommissioner(e.target.value)} />
          <Input id="eventName" label="Event Name" value={eventName} onChange={(e) => setEventName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input id="eventDate" label="Event Date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} placeholder="Feb 9, 2025" />
            <Input id="eventTime" label="Event Time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} placeholder="6:30 PM ET" />
          </div>
        </div>

        {/* Teams */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-lg">Teams</h2>
          <Input id="nfcTeam" label="NFC Team Name" value={nfcTeam} onChange={(e) => setNfcTeam(e.target.value)} />
          <ImagePicker label="NFC Team Logo" value={nfcLogo} onChange={setNfcLogo} />
          <Input id="afcTeam" label="AFC Team Name" value={afcTeam} onChange={(e) => setAfcTeam(e.target.value)} />
          <ImagePicker label="AFC Team Logo" value={afcLogo} onChange={setAfcLogo} />
          <ImagePicker label="Super Bowl Logo" value={sbLogo} onChange={setSbLogo} />
        </div>

        {/* Financials */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-lg">Financials</h2>
          <Input id="betAmount" label="Bet Amount ($)" type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input id="winFirstPct" label="Q1 Payout %" type="number" value={winFirstPct} onChange={(e) => setWinFirstPct(e.target.value)} />
            <Input id="winSecondPct" label="Q2 Payout %" type="number" value={winSecondPct} onChange={(e) => setWinSecondPct(e.target.value)} />
            <Input id="winThirdPct" label="Q3 Payout %" type="number" value={winThirdPct} onChange={(e) => setWinThirdPct(e.target.value)} />
            <Input id="winFinalPct" label="Final Payout %" type="number" value={winFinalPct} onChange={(e) => setWinFinalPct(e.target.value)} />
          </div>
          <Input id="donationPct" label="Donation %" type="number" value={donationPct} onChange={(e) => setDonationPct(e.target.value)} />
          <Input id="graceHours" label="Payment Grace Period (hours)" type="number" value={graceHours} onChange={(e) => setGraceHours(e.target.value)} />
        </div>

        {/* Payment Methods */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Payment Methods</h2>
            <Button size="sm" variant="secondary" onClick={addPayment}>+ Add</Button>
          </div>
          {payments.map((pm, idx) => (
            <div key={idx} className="flex items-end gap-2">
              <div className="space-y-1 flex-shrink-0">
                <label className="block text-sm font-medium text-gray-300">Type</label>
                <select
                  value={pm.type}
                  onChange={(e) => {
                    const updated = [...payments];
                    updated[idx] = { ...updated[idx], type: e.target.value };
                    setPayments(updated);
                  }}
                  className="input-field"
                >
                  <option value="VENMO">Venmo</option>
                  <option value="PAYPAL">PayPal</option>
                  <option value="CASHAPP">Cash App</option>
                  <option value="ZELLE">Zelle</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>
              <div className="flex-1 space-y-1">
                <label className="block text-sm font-medium text-gray-300">Value</label>
                <input
                  value={pm.value}
                  onChange={(e) => {
                    const updated = [...payments];
                    updated[idx] = { ...updated[idx], value: e.target.value };
                    setPayments(updated);
                  }}
                  className="input-field"
                  placeholder="@username or email"
                />
              </div>
              <button
                onClick={() => removePayment(idx)}
                className="text-red-400 hover:text-red-300 p-2"
              >
                &times;
              </button>
            </div>
          ))}

          <div className="space-y-1 pt-2 border-t border-gray-700">
            <label className="block text-sm font-medium text-gray-300">Payment Instructions</label>
            <textarea
              value={paymentInstructions}
              onChange={(e) => setPaymentInstructions(e.target.value)}
              className="input-field resize-none"
              rows={4}
              placeholder="Instructions shown to players after purchasing squares (e.g., 'Please send payment within 48 hours via one of the methods below.')"
            />
          </div>
        </div>

        {/* Rules */}
        <div className="card space-y-4 lg:col-span-2">
          <h2 className="font-semibold text-lg">Rules Text</h2>
          <textarea
            value={rulesText}
            onChange={(e) => setRulesText(e.target.value)}
            className="input-field resize-none"
            rows={6}
            placeholder="Enter the rules for your Super Bowl Squares game..."
          />
        </div>
      </div>
    </div>
  );
}
