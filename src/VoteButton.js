import React, { useEffect, useState, Suspense } from 'react';
import {
  useFirestore,
  useAnalytics,
  useRemoteConfig,
  useUser,
  useFirestoreCollectionData,
  AuthCheck
} from 'reactfire';
import { Button, VoteSubmitted } from './display';

function useRemoteConfigStringValue(key) {
  const remoteConfig = useRemoteConfig();
  const [value, setValue] = useState(null);

  useEffect(() => {
    remoteConfig()
      .ensureInitialized()
      .then(() => {
        return remoteConfig().getValue(key);
      })
      .then(val => {
        setValue(val.asString());
      });
  }, [remoteConfig, key]);

  return value;
}

function VoteButton({ roadId }) {
  const firestore = useFirestore();
  const analytics = useAnalytics();
  const user = useUser();
  const votePrompt = useRemoteConfigStringValue('vote_prompt');

  const saveVote = async () => {
    analytics().logEvent('road_vote', { vote_prompt: votePrompt });

    const ref = firestore()
      .collection('roads')
      .doc(roadId);

    const increment = firestore.FieldValue.increment(1);

    await ref.update({ votes: increment });
    await firestore()
      .collection('users')
      .doc(user.uid)
      .collection('votes')
      .add({ roadId });
  };

  return <Button prompt={votePrompt} disabled={false} onClick={saveVote} />;
}

function VoteIndicator({ roadId }) {
  const user = useUser();
  const firestore = useFirestore();
  const votesRef = firestore()
    .collection('users')
    .doc(user.uid)
    .collection('votes');

  const existingVotes = useFirestoreCollectionData(votesRef);

  const hasVoted = existingVotes.reduce(
    (prev, current) => prev || current.roadId === roadId,
    false
  );

  if (hasVoted) {
    return <VoteSubmitted />;
  }

  return <VoteButton roadId={roadId} />;
}

export default function VoteIndicatorWrapper({ roadId }) {
  return (
    <Suspense fallback={null}>
      <AuthCheck fallback={null}>
        <VoteIndicator roadId={roadId} />
      </AuthCheck>
    </Suspense>
  );
}
