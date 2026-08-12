import { useState } from 'react';
import { UserRound, Lock, KeyRound } from 'lucide-react';
import { useAuthStore } from '../../auth/authStore';
import { api } from '../../api/client';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Form';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/toastStore';

export default function TeacherProfile() {
  const user = useAuthStore((s) => s.user);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirm) {
      toast.error('New password and confirmation do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      toast.success('Password changed successfully.');
      setCurrentPassword(''); setNewPassword(''); setConfirm('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in-up max-w-2xl">
      <PageHeader title="My Profile" subtitle="View your account and update your password" icon={<UserRound className="h-5 w-5" />} />

      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-royal-500 to-royal-700 text-2xl font-bold text-white">
              {user?.fullName?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-navy-900">{user?.fullName}</h2>
              <p className="text-sm text-slate-500">@{user?.username}</p>
            </div>
            <Badge tone={user?.role === 'ADMIN' || user?.role === 'HOD' ? 'royal' : 'teal'}>{user?.role}</Badge>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Change Password" subtitle="Your password is securely hashed on the server" icon={<KeyRound className="h-5 w-5" />} />
        <CardBody>
          <div className="grid gap-4">
            <Field label="Current Password" required>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="pl-10" />
              </div>
            </Field>
            <Field label="New Password" required hint="Minimum 6 characters">
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </Field>
            <Field label="Confirm New Password" required>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </Field>
            <div className="flex justify-end">
              <Button onClick={submit} loading={loading}>Update Password</Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
