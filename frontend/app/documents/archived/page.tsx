import { redirect } from 'next/navigation';

export default function ArchivedDocumentsRedirect() {
  redirect('/documents?status=ARCHIVED');
}
