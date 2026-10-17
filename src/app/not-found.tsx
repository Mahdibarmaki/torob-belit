import Link from "next/link";
import { Brand } from "@/components/brand";

export default function NotFound() {
  return <main className="page-container empty-state"><Brand /><h1>صفحه پیدا نشد</h1><p>برای کشف پروازها به صفحه اصلی ترب بلیط بروید.</p><Link className="button button-inverse" href="/">بازگشت به جست‌وجو</Link></main>;
}
