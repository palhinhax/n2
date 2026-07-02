import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCreatePost } from "@/features/posts/hooks";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useCreatePost", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("creates a post successfully", async () => {
    const mockPost = {
      id: "3",
      title: "New Post",
      content: "Post content",
      authorId: "user1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPost),
    });

    const { result } = renderHook(() => useCreatePost(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      title: "New Post",
      content: "Post content",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toMatchObject({
      title: "New Post",
      content: "Post content",
    });
  });

  it("handles error when creating post fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: "Server error" }),
    });

    const { result } = renderHook(() => useCreatePost(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      title: "New Post",
      content: "Post content",
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
