import { redirect } from 'next/navigation';

/** The workstation is the product. Nothing lives at the root. */
export default function Home() {
  redirect('/dashboard');
}
