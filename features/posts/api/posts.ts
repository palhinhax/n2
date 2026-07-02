import { fetchApi } from "@/lib/api";
import type { Post, CreatePostInput, UpdatePostInput } from "../schemas";

export async function getPosts(): Promise<Post[]> {
  return fetchApi<Post[]>("/api/posts");
}

export async function getPost(id: string): Promise<Post> {
  return fetchApi<Post>(`/api/posts/${id}`);
}

export async function createPost(data: CreatePostInput): Promise<Post> {
  return fetchApi<Post>("/api/posts", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePost(
  id: string,
  data: UpdatePostInput
): Promise<Post> {
  return fetchApi<Post>(`/api/posts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deletePost(id: string): Promise<void> {
  return fetchApi<void>(`/api/posts/${id}`, {
    method: "DELETE",
  });
}
