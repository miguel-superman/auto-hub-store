"use client";


function ChangePasswordDialog({ open, onOpenChange, user }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    if (next.length < 6) return toast.error('Password must be at least 6 characters');
    if (next !== confirm) return toast.error('Passwords do not match');
    setBusy(true);
    try {
      if (isFirebaseConfigured) {
        const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import('firebase/auth');
        const cred = EmailAuthProvider.credential(user.email, current);
        await reauthenticateWithCredential(auth.currentUser, cred);
        await updatePassword(auth.currentUser, next);
        toast.success('Password updated');
      } else {
        await new Promise((r) => setTimeout(r, 500));
        toast.success('Password updated (demo)');
      }
      onOpenChange(false);
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err) {
      toast.error(err?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>Re-enter current password to update.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Current password</Label>
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>New password</Label>
            <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Confirm new password</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handle} disabled={busy} className="bg-orange-500 hover:bg-orange-600">
            {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Update password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ChangePasswordDialog