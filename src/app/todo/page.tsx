import { db } from "@/db";
import { todos } from "@/db/schema";
import { desc } from "drizzle-orm";
import { TodoClient } from "@/components/todo/todo-client";

export default async function TodoPage() {
  const allTodos = await db.select().from(todos).orderBy(desc(todos.createdAt)).all();
  const pendingCount = allTodos.filter((t) => !t.done).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">To Do</h1>
        <p className="text-gray-500 mt-1 text-sm">
          {pendingCount === 0 ? "Nothing left to do 🎉" : `${pendingCount} thing${pendingCount === 1 ? "" : "s"} to do`}
        </p>
      </div>

      <TodoClient todos={allTodos.map((t) => ({
        id: t.id,
        text: t.text,
        category: (t.category ?? "personal") as "opspot" | "personal" | "nice-cubes" | "other",
        bucket:   (t.bucket   ?? "general")  as "today" | "general",
        done: t.done,
        createdAt: t.createdAt,
      }))} />
    </div>
  );
}
