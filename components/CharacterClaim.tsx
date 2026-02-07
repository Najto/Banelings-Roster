import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { claimService, UserClaim } from '../services/claimService';
import { battlenetOAuthService } from '../services/battlenetOAuthService';
import { Check, X, Loader2, Shield, AlertCircle } from 'lucide-react';
import { ClassBadge } from './ClassBadge';

interface CharacterClaimProps {
  roster: Player[];
  userId: string;
  battlenetId: string;
}

export const CharacterClaim: React.FC<CharacterClaimProps> = ({ roster, userId, battlenetId }) => {
  const [claims, setClaims] = useState<UserClaim[]>([]);
  const [allClaims, setAllClaims] = useState<UserClaim[]>([]);
  const [battlenetChars, setBattlenetChars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [userClaims, allClaimsData, cachedChars] = await Promise.all([
        claimService.getUserClaims(userId),
        claimService.getAllClaims(),
        battlenetOAuthService.getCachedCharacters(userId)
      ]);

      setClaims(userClaims);
      setAllClaims(allClaimsData);
      setBattlenetChars(cachedChars);
    } catch (e) {
      setError('Failed to load claim data');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (memberName: string, charName: string, realm: string) => {
    setClaiming(memberName);
    setError(null);

    const result = await claimService.claimCharacter(
      userId,
      battlenetId,
      memberName,
      charName,
      realm
    );

    if (result.success) {
      await loadData();
    } else {
      setError(result.error || 'Failed to claim character');
    }

    setClaiming(null);
  };

  const handleUnclaim = async (claimId: string) => {
    const result = await claimService.unclaimCharacter(claimId);
    if (result.success) {
      await loadData();
    } else {
      setError(result.error || 'Failed to unclaim character');
    }
  };

  const isCharacterOnBattleNet = (charName: string, realm: string): boolean => {
    return battlenetChars.some(
      char => char.character_name.toLowerCase() === charName.toLowerCase() &&
              char.realm.toLowerCase() === realm.toLowerCase()
    );
  };

  const isCharacterClaimed = (memberName: string): UserClaim | null => {
    return allClaims.find(c => c.guild_member_name === memberName) || null;
  };

  const getMyClaim = (memberName: string): UserClaim | null => {
    return claims.find(c => c.guild_member_name === memberName) || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500" size={20} />
          <p className="text-red-400 text-sm font-bold">{error}</p>
        </div>
      )}

      {claims.length > 0 && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="text-emerald-500" size={20} />
            <h3 className="text-lg font-black text-white uppercase tracking-wider">Your Claims</h3>
          </div>
          <div className="space-y-2">
            {claims.map(claim => (
              <div
                key={claim.id}
                className="bg-black/40 border border-white/10 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {claim.verified ? (
                    <Check className="text-emerald-500" size={16} />
                  ) : (
                    <X className="text-amber-500" size={16} />
                  )}
                  <div>
                    <p className="text-white font-bold text-sm">{claim.guild_member_name}</p>
                    <p className="text-slate-400 text-xs">
                      {claim.character_name} - {claim.realm}
                      <span className={`ml-2 ${claim.verified ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {claim.verified ? 'Verified' : 'Unverified'}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleUnclaim(claim.id)}
                  className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-500/20 transition-all"
                >
                  Unclaim
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-black text-white uppercase tracking-wider">Available Members</h3>
        <div className="grid gap-3">
          {roster.map(player => {
            const char = player.mainCharacter;
            const realm = char.server || 'blackhand';
            const existingClaim = isCharacterClaimed(player.name);
            const myClaim = getMyClaim(player.name);
            const onBattleNet = isCharacterOnBattleNet(char.name, realm);

            return (
              <div
                key={player.name}
                className={`bg-black/40 border rounded-xl p-4 transition-all ${
                  myClaim
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : existingClaim
                    ? 'border-white/5 opacity-50'
                    : onBattleNet
                    ? 'border-indigo-500/40 bg-indigo-500/5'
                    : 'border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <ClassBadge wowClass={char.class} />
                    <div>
                      <p className="text-white font-bold text-sm">{player.name}</p>
                      <p className="text-slate-400 text-xs">
                        {char.name} - {realm}
                      </p>
                      {onBattleNet && !existingClaim && (
                        <p className="text-indigo-400 text-xs font-bold mt-1">On your Battle.net account</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {myClaim ? (
                      <div className="flex items-center gap-2 text-emerald-500">
                        <Check size={16} />
                        <span className="text-xs font-bold uppercase">Claimed</span>
                      </div>
                    ) : existingClaim ? (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Shield size={16} />
                        <span className="text-xs font-bold uppercase">Claimed by Other</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleClaim(player.name, char.name, realm)}
                        disabled={claiming === player.name || !onBattleNet}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                          onBattleNet
                            ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                            : 'bg-white/5 text-slate-600 cursor-not-allowed'
                        } disabled:opacity-50`}
                      >
                        {claiming === player.name ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          'Claim'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {battlenetChars.length === 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <p className="text-amber-400 text-sm">
            No Battle.net characters loaded. The characters will be fetched when you log in with Battle.net.
          </p>
        </div>
      )}
    </div>
  );
};
