import { http, HttpResponse } from "msw";

interface PostBody {
  title?: string;
  content?: string;
}

const posts = [
  {
    id: "1",
    title: "Test Post 1",
    content: "Content 1",
    authorId: "user1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: { id: "user1", name: "Test User", email: "test@example.com" },
  },
  {
    id: "2",
    title: "Test Post 2",
    content: "Content 2",
    authorId: "user1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: { id: "user1", name: "Test User", email: "test@example.com" },
  },
];

export const handlers = [
  http.get("/api/posts", () => {
    return HttpResponse.json(posts);
  }),

  http.get("/api/posts/:id", ({ params }) => {
    const post = posts.find((p) => p.id === params.id);
    if (!post) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(post);
  }),

  http.post("/api/posts", async ({ request }) => {
    const body = (await request.json()) as PostBody;
    const newPost = {
      id: "3",
      title: body.title || "",
      content: body.content || "",
      authorId: "user1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: { id: "user1", name: "Test User", email: "test@example.com" },
    };
    return HttpResponse.json(newPost, { status: 201 });
  }),

  http.patch("/api/posts/:id", async ({ params, request }) => {
    const body = (await request.json()) as PostBody;
    const post = posts.find((p) => p.id === params.id);
    if (!post) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({
      ...post,
      title: body.title ?? post.title,
      content: body.content ?? post.content,
    });
  }),

  http.delete("/api/posts/:id", ({ params }) => {
    const post = posts.find((p) => p.id === params.id);
    if (!post) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({ message: "Post deleted" });
  }),
];
