import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Users, X, Check, Mail, Crown, Clock } from 'lucide-react';
import { toast } from "sonner";

export default function SharedAccountManager({ user, accountOwner }) {
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const queryClient = useQueryClient();
  
  const isOwner = user?.email === accountOwner;

  // Get shared accounts where user is owner
  const { data: mySharedAccounts = [] } = useQuery({
    queryKey: ['sharedAccounts', 'owner', user?.email],
    queryFn: () => base44.entities.SharedAccount.filter({ owner_email: user?.email }),
    enabled: !!user?.email && isOwner
  });

  // Get invitations sent to this user
  const { data: invitations = [] } = useQuery({
    queryKey: ['sharedAccounts', 'member', user?.email],
    queryFn: () => base44.entities.SharedAccount.filter({ member_email: user?.email, status: 'pending' }),
    enabled: !!user?.email
  });

  const inviteMutation = useMutation({
    mutationFn: async (memberEmail) => {
      return base44.entities.SharedAccount.create({
        owner_email: user.email,
        member_email: memberEmail,
        status: 'pending'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedAccounts'] });
      setEmail('');
      toast.success('Invitation sent!');
    }
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, status, ownerEmail }) => {
      await base44.entities.SharedAccount.update(id, { 
        status,
        member_name: user.full_name 
      });
      if (status === 'accepted') {
        await base44.auth.updateMe({ shared_with_account: ownerEmail });
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['sharedAccounts'] });
      if (status === 'accepted') {
        toast.success('You now have access to the shared account!');
        window.location.reload();
      }
    }
  });

  const removeMutation = useMutation({
    mutationFn: (id) => base44.entities.SharedAccount.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedAccounts'] });
      toast.success('Member removed');
    }
  });

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    await inviteMutation.mutateAsync(email.trim().toLowerCase());
    setInviting(false);
  };

  const acceptedMembers = mySharedAccounts.filter(s => s.status === 'accepted');
  const pendingInvites = mySharedAccounts.filter(s => s.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Pending invitations for this user */}
      {invitations.length > 0 && (
        <Card className="p-4 border-emerald-200 bg-emerald-50">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-600" />
            Pending Invitations
          </h3>
          <div className="space-y-2">
            {invitations.map(inv => (
              <div key={inv.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                <div>
                  <p className="font-medium text-slate-800">{inv.owner_email}</p>
                  <p className="text-xs text-slate-500">Wants to share their Penny account with you</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => respondMutation.mutate({ id: inv.id, status: 'declined' })}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-500 hover:bg-emerald-600"
                    onClick={() => respondMutation.mutate({ id: inv.id, status: 'accepted', ownerEmail: inv.owner_email })}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Only show management if user is the account owner */}
      {isOwner && (
        <>
          {/* Invite form */}
          <Card className="p-4 border-0 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              Invite Someone to Share
            </h3>
            <form onSubmit={handleInvite} className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button 
                type="submit" 
                disabled={inviting || !email.trim()}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                {inviting ? 'Sending...' : 'Invite'}
              </Button>
            </form>
          </Card>

          {/* Current members */}
          {(acceptedMembers.length > 0 || pendingInvites.length > 0) && (
            <Card className="p-4 border-0 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                Shared With
              </h3>
              <div className="space-y-2">
                {/* Owner */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Crown className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{user?.full_name || 'You'}</p>
                      <p className="text-xs text-slate-500">Owner</p>
                    </div>
                  </div>
                </div>

                {/* Accepted members */}
                {acceptedMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                        {member.member_name?.[0] || member.member_email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{member.member_name || member.member_email}</p>
                        <p className="text-xs text-slate-500">{member.member_email}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => removeMutation.mutate(member.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                {/* Pending invites */}
                {pendingInvites.map(invite => (
                  <div key={invite.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{invite.member_email}</p>
                        <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => removeMutation.mutate(invite.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}