import { getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";

const STORE_NAME = "tsumugu-news";
const DATA_KEY = "items";
const CATEGORIES = ["お知らせ", "見学・体験", "求人情報"];

const initialItems = [
  { id: "welcome", date: "2026-01-01", category: "お知らせ", title: "ホームページを公開しました", body: "就労継続支援A型事業所 紡 -tsumugu- のホームページを公開しました。\n\n事業内容やご利用についての情報、見学・体験のご案内などを、分かりやすくお届けしてまいります。" },
  { id: "visit", date: "2026-01-01", category: "見学・体験", title: "見学・体験受付中です", body: "紡では、見学や体験について随時ご相談を受け付けています。\n\n雰囲気を見てみたい方も、働き方について相談したい方も、どうぞお気軽にお問い合わせください。" },
  { id: "recruit", date: "2026-01-01", category: "求人情報", title: "求人情報を更新しました", body: "求人についてのご相談を受け付けています。詳しくはお問い合わせください。" }
];

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

async function readItems(store) {
  const saved = await store.get(DATA_KEY, { type: "json", consistency: "strong" });
  return Array.isArray(saved) ? saved : initialItems;
}

function cleanText(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeItem(input, existingId) {
  const date = cleanText(input.date, 10);
  const category = cleanText(input.category, 20);
  const title = cleanText(input.title, 120);
  const body = cleanText(input.body, 10000);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !CATEGORIES.includes(category) || !title || !body) return null;
  return {
    id: existingId || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    date,
    category,
    title,
    body,
    updatedAt: new Date().toISOString()
  };
}

export default async (request) => {
  try {
    const store = getStore(STORE_NAME);
    const items = await readItems(store);
    const method = request.method.toUpperCase();

    if (method === "GET") {
      const id = cleanText(new URL(request.url).searchParams.get("id"), 100);
      const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));
      if (!id) return json({ items: sorted });
      const item = sorted.find((entry) => entry.id === id);
      return item ? json({ item }) : json({ error: "お知らせが見つかりません。" }, 404);
    }

    const user = await getUser();
    if (!user) return json({ error: "ログインが必要です。" }, 401);

    let input;
    try {
      input = await request.json();
    } catch {
      return json({ error: "入力内容を確認してください。" }, 400);
    }

    if (method === "POST") {
      const item = normalizeItem(input);
      if (!item) return json({ error: "必須項目を正しく入力してください。" }, 400);
      await store.setJSON(DATA_KEY, [item, ...items]);
      return json({ item }, 201);
    }

    if (method === "PUT") {
      const id = cleanText(input.id, 100);
      const index = items.findIndex((entry) => entry.id === id);
      if (index < 0) return json({ error: "お知らせが見つかりません。" }, 404);
      const item = normalizeItem(input, id);
      if (!item) return json({ error: "必須項目を正しく入力してください。" }, 400);
      const nextItems = [...items];
      nextItems[index] = item;
      await store.setJSON(DATA_KEY, nextItems);
      return json({ item });
    }

    if (method === "DELETE") {
      const id = cleanText(input.id, 100);
      const nextItems = items.filter((entry) => entry.id !== id);
      if (nextItems.length === items.length) return json({ error: "お知らせが見つかりません。" }, 404);
      await store.setJSON(DATA_KEY, nextItems);
      return json({ success: true });
    }

    return json({ error: "許可されていない操作です。" }, 405);
  } catch (error) {
    console.error("News function error", error);
    return json({ error: "処理に失敗しました。時間をおいて再度お試しください。" }, 500);
  }
};
