import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PostForm } from "@/features/posts/components/post-form";

describe("PostForm", () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders empty form correctly", () => {
    render(<PostForm onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/content/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });

  it("renders with initial values when editing", () => {
    const post = {
      id: "1",
      title: "Test Title",
      content: "Test Content",
      authorId: "user1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    render(<PostForm post={post} onSubmit={mockOnSubmit} />);

    expect(screen.getByDisplayValue("Test Title")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test Content")).toBeInTheDocument();
  });

  it("shows validation errors for empty fields", async () => {
    const user = userEvent.setup();
    render(<PostForm onSubmit={mockOnSubmit} />);

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      expect(screen.getByText(/content is required/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("submits form with valid data", async () => {
    const user = userEvent.setup();
    render(<PostForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/title/i), "New Post Title");
    await user.type(screen.getByLabelText(/content/i), "New Post Content");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    const callArgs = mockOnSubmit.mock.calls[0][0];
    expect(callArgs.title).toBe("New Post Title");
    expect(callArgs.content).toBe("New Post Content");
  });

  it("shows loading state when isLoading is true", () => {
    render(<PostForm onSubmit={mockOnSubmit} isLoading />);

    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  it("uses custom submit label", () => {
    render(<PostForm onSubmit={mockOnSubmit} submitLabel="Create" />);

    expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument();
  });
});
