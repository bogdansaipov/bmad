import { EmptyState } from '../../shared/components/EmptyState';

export function JobFeedEmptyState() {
  return (
    <EmptyState
      icon="🛠️"
      title="No jobs available right now"
      description="Stay online to receive new requests."
    />
  );
}
