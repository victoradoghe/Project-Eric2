import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Save, ShieldQuestion, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckboxField, SelectField } from '@/components/forms/FieldControls';
import SignInPrompt from '@/components/forms/SignInPrompt';
import { ACCOUNT_ROLES, NOTIFICATION_FREQUENCIES } from '@/lib/constants';

export default function Profile() {
  const { user, checkUserAuth } = useAuth() || {};
  const { toast } = useToast();
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    avatar_url: '',
    account_roles: [],
    notification_frequency: 'instant',
    email_notifications: true,
  });
  const [agentForm, setAgentForm] = useState({
    display_name: '',
    phone: '',
    bio: '',
    specialties: '',
    service_areas: '',
    license_number: '',
    license_state: '',
    years_experience: '',
    website: '',
    agency_name: '',
  });
  const [agentProfile, setAgentProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      full_name: user.full_name || '',
      phone: user.phone || '',
      avatar_url: user.avatar_url || '',
      account_roles: Array.isArray(user.account_roles) ? user.account_roles : [],
      notification_frequency: user.notification_frequency || 'instant',
      email_notifications: user.email_notifications !== false,
    });
    base44.entities.AgentProfile.filter({ user_id: user.id }, { limit: 1 })
      .then((page) => {
        const record = (page?.items || [])[0] || null;
        setAgentProfile(record);
        if (record) {
          setAgentForm({
            display_name: record.display_name || '',
            phone: record.phone || '',
            bio: record.bio || '',
            specialties: (record.specialties || []).join(', '),
            service_areas: (record.service_areas || []).join(', '),
            license_number: record.license_number || '',
            license_state: record.license_state || '',
            years_experience: record.years_experience ?? '',
            website: record.website || '',
            agency_name: record.agency_name || '',
          });
        } else {
          setAgentForm((current) => ({ ...current, display_name: user.full_name || '', phone: user.phone || '' }));
        }
      })
      .catch(() => setAgentProfile(null));
  }, [user]);

  if (!user?.id) {
    return (
      <div className="dm-container py-14">
        <div className="mx-auto max-w-lg">
          <h1 className="font-display text-2xl font-semibold">Your profile</h1>
          <div className="mt-6">
            <SignInPrompt title="Sign in to manage your profile" description="Update your details and preferences." />
          </div>
        </div>
      </div>
    );
  }

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setForm((current) => ({ ...current, avatar_url: file_url }));
      toast({ title: 'Image ready', description: 'Save your profile to apply it.' });
    } catch (error) {
      toast({ title: 'Upload failed', description: error?.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updates = {
        full_name: form.full_name,
        phone: form.phone,
        avatar_url: form.avatar_url,
        account_roles: form.account_roles,
        notification_frequency: form.notification_frequency,
        email_notifications: form.email_notifications,
      };

      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.updateUser({ data: updates });
        if (error) throw error;
      } else {
        await base44.auth.updateMe(updates);
      }
      toast({ title: 'Profile saved' });
      await checkUserAuth?.();
    } catch (error) {
      toast({ title: 'Could not save your profile', description: error?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const saveAgentProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        display_name: agentForm.display_name || user.full_name || user.email,
        email: user.email,
        phone: agentForm.phone,
        bio: agentForm.bio,
        specialties: agentForm.specialties.split(',').map((item) => item.trim()).filter(Boolean),
        service_areas: agentForm.service_areas.split(',').map((item) => item.trim()).filter(Boolean),
        license_number: agentForm.license_number,
        license_state: agentForm.license_state,
        years_experience: Number(agentForm.years_experience) || undefined,
        website: agentForm.website,
        agency_name: agentForm.agency_name,
      };

      if (agentProfile?.id) {
        await base44.entities.AgentProfile.update(agentProfile.id, payload);
      } else {
        const created = await base44.entities.AgentProfile.create({ ...payload, verification_status: 'unverified' });
        setAgentProfile(created);
      }
      toast({ title: 'Agent profile saved', description: 'It is now visible in the agent directory.' });
    } catch (error) {
      toast({ title: 'Could not save the agent profile', description: error?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const requestVerification = async () => {
    if (!agentProfile?.id) {
      toast({ title: 'Save your agent profile first', variant: 'destructive' });
      return;
    }
    try {
      await base44.entities.AgentProfile.update(agentProfile.id, { verification_status: 'pending' });
      setAgentProfile((current) => ({ ...current, verification_status: 'pending' }));
      toast({
        title: 'Verification requested',
        description: 'An administrator will review your licence details. Until then your profile is not shown as verified.',
      });
    } catch (error) {
      toast({ title: 'Could not request verification', description: error?.message, variant: 'destructive' });
    }
  };

  const verification = agentProfile?.verification_status || 'unverified';

  return (
    <div className="dm-container max-w-4xl py-10">
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">Your profile</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Signed in as {user.email}
        {user.role === 'admin' ? ' · administrator' : ''}
      </p>

      <form onSubmit={saveProfile} className="dm-card mt-7 space-y-5 p-6">
        <h2 className="font-display text-lg font-semibold">Account details</h2>
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid h-16 w-16 overflow-hidden rounded-2xl bg-secondary">
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="Your profile" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center text-xs text-muted-foreground">No photo</span>
            )}
          </span>
          <label className="dm-focus inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:bg-secondary">
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading…' : 'Upload photo'}
            <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} disabled={uploading} />
          </label>
          <p className="text-xs text-muted-foreground">Profile photos are stored publicly — anyone with the link can open them.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="profile-name" className="dm-label">
              Full name
            </Label>
            <Input
              id="profile-name"
              value={form.full_name}
              onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="profile-phone" className="dm-label">
              Phone
            </Label>
            <Input
              id="profile-phone"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            />
          </div>
        </div>

        <div>
          <p className="dm-label">I am here as</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {ACCOUNT_ROLES.map((role) => (
              <CheckboxField
                key={role.value}
                id={`role-${role.value}`}
                label={role.label}
                checked={form.account_roles.includes(role.value)}
                onChange={(checked) =>
                  setForm((current) => ({
                    ...current,
                    account_roles: checked
                      ? [...current.account_roles, role.value]
                      : current.account_roles.filter((item) => item !== role.value),
                  }))
                }
              />
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id="profile-frequency"
            label="Alert frequency"
            value={form.notification_frequency}
            onChange={(value) => setForm((current) => ({ ...current, notification_frequency: value || 'instant' }))}
            options={NOTIFICATION_FREQUENCIES}
            emptyLabel="As it happens"
          />
          <div className="flex items-end">
            <CheckboxField
              id="profile-emails"
              label="Send me alert emails"
              checked={form.email_notifications}
              onChange={(checked) => setForm((current) => ({ ...current, email_notifications: checked }))}
            />
          </div>
        </div>

        <Button type="submit" disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
      </form>

      <form onSubmit={saveAgentProfile} className="dm-card mt-6 space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Agent profile</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Published in the agent directory so buyers and renters can find you.
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              verification === 'verified' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
            }`}
          >
            {verification === 'verified' ? <BadgeCheck className="h-3.5 w-3.5" /> : <ShieldQuestion className="h-3.5 w-3.5" />}
            {verification === 'verified'
              ? 'Verified by Dwellmark'
              : verification === 'pending'
                ? 'Verification under review'
                : 'Not verified'}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="agent-name" className="dm-label">
              Display name
            </Label>
            <Input
              id="agent-name"
              value={agentForm.display_name}
              onChange={(event) => setAgentForm((current) => ({ ...current, display_name: event.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="agent-phone" className="dm-label">
              Business phone
            </Label>
            <Input
              id="agent-phone"
              value={agentForm.phone}
              onChange={(event) => setAgentForm((current) => ({ ...current, phone: event.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="agent-agency" className="dm-label">
              Agency or brokerage
            </Label>
            <Input
              id="agent-agency"
              value={agentForm.agency_name}
              onChange={(event) => setAgentForm((current) => ({ ...current, agency_name: event.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="agent-license" className="dm-label">
              Licence number
            </Label>
            <Input
              id="agent-license"
              value={agentForm.license_number}
              onChange={(event) => setAgentForm((current) => ({ ...current, license_number: event.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="agent-state" className="dm-label">
              Licence state or region
            </Label>
            <Input
              id="agent-state"
              value={agentForm.license_state}
              onChange={(event) => setAgentForm((current) => ({ ...current, license_state: event.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="agent-years" className="dm-label">
              Years of experience
            </Label>
            <Input
              id="agent-years"
              type="number"
              value={agentForm.years_experience}
              onChange={(event) => setAgentForm((current) => ({ ...current, years_experience: event.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="agent-specialties" className="dm-label">
              Specialties (comma separated)
            </Label>
            <Input
              id="agent-specialties"
              value={agentForm.specialties}
              placeholder="First-time buyers, Condos, Rentals"
              onChange={(event) => setAgentForm((current) => ({ ...current, specialties: event.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="agent-areas" className="dm-label">
              Service areas (comma separated)
            </Label>
            <Input
              id="agent-areas"
              value={agentForm.service_areas}
              placeholder="Austin, Round Rock"
              onChange={(event) => setAgentForm((current) => ({ ...current, service_areas: event.target.value }))}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="agent-bio" className="dm-label">
            About you
          </Label>
          <Textarea
            id="agent-bio"
            rows={4}
            value={agentForm.bio}
            onChange={(event) => setAgentForm((current) => ({ ...current, bio: event.target.value }))}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {agentProfile ? 'Save agent profile' : 'Create agent profile'}
          </Button>
          {verification === 'unverified' ? (
            <Button type="button" variant="outline" onClick={requestVerification}>
              Request verification
            </Button>
          ) : null}
          {agentProfile ? (
            <Button type="button" variant="outline" asChild>
              <Link to={`/agents/${agentProfile.id}`}>View public profile</Link>
            </Button>
          ) : null}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Licences and credentials are only shown as verified after an administrator has reviewed them. Until
          then your profile is labelled as not verified.
        </p>
      </form>
    </div>
  );
}