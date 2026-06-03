import { db } from "@/db";
import { todos } from "@/db/schema";
import { desc } from "drizzle-orm";
import { TodoClient } from "@/components/todo/todo-client";

export default async function TodoPage() {
  const allTodos = await db.select().from(todos).orderBy(desc(todos.createdAt)).all();

  const pending   = allTodos.filter((t) => !t.done);
  const completed = allTodos.filter((t) => t.done);

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">To Do</h1>
        <p className="text-gray-500 mt-1 text-sm">
          {pending.length === 0 ? "Nothing left to do 🎉" : `${pending.length} thing${pending.length === 1 ? "" : "s"} to do`}
        </p>
      </div>

      <TodoClient pending={pending} completed={completed} />
    </div>
  );
}
