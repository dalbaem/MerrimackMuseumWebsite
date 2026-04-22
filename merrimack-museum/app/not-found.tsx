import IllustratedState from '@/components/IllustratedState';
export default function NotFound() {
  return (
    <IllustratedState
      title="Something is not right..."
      description="Page you are trying to open does not exist. You may have mistyped the address, or the page has been moved to another URL. If you think this is an error contact support."
      actionHref="/collection"
      actionLabel="Browse the collection"
      imageAlt="Illustration for a missing page"
    />
  );
}
