import { AddIcon, DeleteIcon } from "@chakra-ui/icons";
import { Box, Stack, Text } from "@chakra-ui/layout";
import { useToast } from "@chakra-ui/toast";
import axios from "axios";
import { useEffect, useState } from "react";
import ChatLoading from "./ChatLoading.js";
import GroupChatModal from "./miscellaneous/GroupChatModal.js";
import { Badge, Button, IconButton } from "@chakra-ui/react";
import { Avatar } from "@chakra-ui/avatar";
import { ChatState } from "../Context/ChatProvider.js";
import "./styles.css";

const MyChats = ({ fetchAgain }) => {
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState(false);
  const [hidingChatId, setHidingChatId] = useState(null);

  const { selectedChat, setSelectedChat, user, chats, setChats } = ChatState();

  const toast = useToast();

  const fetchChats = async () => {
    if (!user) return;
    setChatLoading(true);
    setChatError(false);
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.get("/api/chat", config);
      setChats(data);
    } catch (error) {
      setChatError(true);
      toast({
        title: "Error Occured!",
        description: "Failed to Load the chats",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
    } finally {
      setChatLoading(false);
    }
  };

  const hideChat = async (chat) => {
    setHidingChatId(chat._id);
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      await axios.delete(`/api/chat/${chat._id}`, config);
      setChats((currentChats) =>
        currentChats?.filter((currentChat) => currentChat._id !== chat._id)
      );
      if (selectedChat?._id === chat._id) setSelectedChat("");
      toast({
        title: "Chat hidden",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "bottom-left",
      });
    } catch (error) {
      toast({
        title: "Could not hide chat",
        description: error.response?.data?.message || "Please try again.",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "bottom-left",
      });
    } finally {
      setHidingChatId(null);
    }
  };

  useEffect(() => {
    fetchChats();
    // eslint-disable-next-line
  }, [fetchAgain, user]);

  return (
    <Box
      d={{ base: selectedChat ? "none" : "flex", md: "flex" }}
      flexDir="column"
      p={4}
      bg="rgba(255, 255, 255, 0.70)"
      backdropFilter="blur(10px)"
      w={{ base: "100%", md: "35%" }}
      minW={{ md: "280px" }}
      borderRadius="8px"
      borderWidth="1px"
      borderColor="#d9dfe4"
      boxShadow="0 8px 28px rgba(30, 55, 46, 0.06)"
    >
      <Box
        pb={4}
        d="flex"
        w="100%"
        justifyContent="space-between"
        alignItems="center"
      >
        <Box>
          <Text fontSize="xs" fontWeight="bold" color="#72808d" letterSpacing="0.08em">
            YOUR INBOX
          </Text>
          <Text fontSize="xl" fontWeight="semibold" color="#233344" mt={1}>
            My chats
          </Text>
        </Box>
        <GroupChatModal>
          <Button
            size="sm"
            bg="#e9edf1"
            color="#26384a"
            _hover={{ bg: "#dce3e9" }}
            fontSize="sm"
            rightIcon={<AddIcon />}
          >
            New Group Chat
          </Button>
        </GroupChatModal>
      </Box>
      <Box
        d="flex"
        flexDir="column"
        p={2}
        bg="rgba(244, 246, 247, 0.54)"
        backdropFilter="blur(8px)"
        w="100%"
        h="100%"
        borderRadius="6px"
        overflowY="hidden"
      >
        {chatLoading ? (
          <ChatLoading />
        ) : chatError ? (
          <Box textAlign="center" py={10}>
            <Text fontWeight="semibold">Chats couldn’t load</Text>
            <Button size="sm" mt={4} onClick={() => fetchChats()}>
              Try again
            </Button>
          </Box>
        ) : chats?.length ? (
          <Stack spacing={1} overflowY="auto" h="100%">
            {chats.map((chat) => {
              const otherUser = chat.users.find(
                (chatUser) => chatUser._id !== user._id
              );
              const chatTitle = chat.isGroupChat
                ? chat.chatName
                : otherUser?.name || "Direct chat";
              const isSelected = selectedChat?._id === chat._id;

              return (
                <Box
                  key={chat._id}
                  className="chat-list-item"
                  display="flex"
                  alignItems="center"
                  gap={3}
                  w="100%"
                  px={3}
                  py={3}
                  borderRadius="6px"
                  borderLeft="3px solid"
                  borderLeftColor={isSelected ? "#b66d4c" : "transparent"}
                  bg={isSelected ? "#f3eae5" : "transparent"}
                  color="#253443"
                  _hover={{ bg: isSelected ? "#f3eae5" : "#e9edf0" }}
                  transition="background 120ms ease"
                >
                  <Box
                    as="button"
                    type="button"
                    onClick={() => {
                      setSelectedChat(chat);
                      setChats((currentChats) =>
                        currentChats?.map((currentChat) =>
                          currentChat._id === chat._id
                            ? { ...currentChat, unreadCount: 0 }
                            : currentChat
                        )
                      );
                    }}
                    display="flex"
                    alignItems="center"
                    gap={3}
                    textAlign="left"
                    flex="1"
                    minW={0}
                  >
                    {chat.unreadCount > 0 && (
                      <Badge
                        minW="22px"
                        px={1.5}
                        py={0.5}
                        borderRadius="full"
                        textAlign="center"
                        bg="#a75f40"
                        color="white"
                        fontSize="xs"
                        aria-label={`${chat.unreadCount} unread messages`}
                        flexShrink={0}
                      >
                        {chat.unreadCount}
                      </Badge>
                    )}
                    <Avatar
                      size="sm"
                      name={chatTitle}
                      src={chat.isGroupChat ? undefined : otherUser?.pic}
                      bg="#dfe6eb"
                      color="#35495c"
                      flexShrink={0}
                    />
                    <Box minW={0} flex="1">
                      <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
                        {chatTitle}
                      </Text>
                      <Text fontSize="xs" color="#71808b" noOfLines={1} mt={1}>
                        {chat.latestMessage
                          ? `${chat.latestMessage.sender.name}: ${chat.latestMessage.content}`
                          : "Start a conversation"}
                      </Text>
                    </Box>
                  </Box>
                  <IconButton
                    className="delete-chat-button"
                    icon={<DeleteIcon />}
                    aria-label={`Hide chat with ${chatTitle}`}
                    title="Hide chat"
                    size="sm"
                    variant="ghost"
                    color="#71808b"
                    _hover={{ color: "#a33d3d", bg: "#f3e5e5" }}
                    isLoading={hidingChatId === chat._id}
                    isDisabled={hidingChatId !== null && hidingChatId !== chat._id}
                    onClick={() => hideChat(chat)}
                  />
                </Box>
              );
            })}
          </Stack>
        ) : (
          <Box textAlign="center" py={12} px={4}>
            <Text fontWeight="semibold" color="#253443">
              No conversations yet
            </Text>
            <Text fontSize="sm" color="#71808b" mt={2}>
              Search for someone to start a chat.
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default MyChats;
