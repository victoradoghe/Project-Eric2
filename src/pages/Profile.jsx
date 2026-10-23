import { useEffect, useState } from 'react';
import { Save, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    </div>
  );
}
