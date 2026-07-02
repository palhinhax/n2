"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PostForm } from "./post-form";
import {
  usePosts,
  useCreatePost,
  useUpdatePost,
  useDeletePost,
} from "../hooks";
import type { Post, PostFormData } from "../schemas";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PostsTable() {
  const { data: posts, isLoading, error } = usePosts();
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const deletePost = useDeletePost();

  const handleCreate = async (data: PostFormData) => {
    try {
      await createPost.mutateAsync(data);
      toast({ title: "Success", description: "Post created successfully" });
      setIsDialogOpen(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async (data: PostFormData) => {
    if (!editingPost) return;
    try {
      await updatePost.mutateAsync({ id: editingPost.id, data });
      toast({ title: "Success", description: "Post updated successfully" });
      setEditingPost(null);
      setIsDialogOpen(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to update post",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      await deletePost.mutateAsync(id);
      toast({ title: "Success", description: "Post deleted successfully" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (post: Post) => {
    setEditingPost(post);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingPost(null);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-destructive">Failed to load posts</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Posts</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPost ? "Edit Post" : "Create Post"}
              </DialogTitle>
            </DialogHeader>
            <PostForm
              post={editingPost ?? undefined}
              onSubmit={editingPost ? handleUpdate : handleCreate}
              isLoading={createPost.isPending || updatePost.isPending}
              submitLabel={editingPost ? "Update" : "Create"}
            />
          </DialogContent>
        </Dialog>
      </div>

      {!posts?.length ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              No posts yet. Create your first post!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{post.title}</CardTitle>
                    <CardDescription>
                      {new Date(post.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEditDialog(post)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(post.id)}
                      disabled={deletePost.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {post.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
