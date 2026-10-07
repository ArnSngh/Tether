import { FormControl } from "@chakra-ui/form-control";
import { Input } from "@chakra-ui/input";
import { Box, Text } from "@chakra-ui/layout";
import "./styles.css";
import { Button, IconButton, Spinner, useToast } from "@chakra-ui/react";
import { getSender, getSenderFull } from "../config/ChatLogics.js";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { ArrowBackIcon, ChatIcon, SearchIcon } from "@chakra-ui/icons";
import ProfileModal from "./miscellaneous/ProfileModal.js";
import ScrollableChat from "./ScrollableChat.js";
import Lottie from "react-lottie";
import animationData from "../animations/typing.json";

import io from "socket.io-client";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal.js";
import { ChatState } from "../Context/ChatProvider.js";
const ENDPOINT =
  process.env.REACT_APP_SOCKET_URL ||
  (/^(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})$/.test(
    window.location.hostname
  )
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : "https://tether-vn0e.onrender.com");

const SingleChat = ({ fetchAgain, setFetchAgain, onOpenSearch }) => {
  const { selectedChat, setSelectedChat, user, setNotification, chats } =
    ChatState();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [guestMessagesRemaining, setGuestMessagesRemaining] = useState(
    user?.guestMessagesRemaining
  );
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [istyping, setIsTyping] = useState(false);
  const socketRef = useRef(null);
  const selectedChatRef = useRef(selectedChat);
  const typingTimeoutRef = useRef(null);
  const toast = useToast();
  const guestLimitReached =
    user?.email?.toLowerCase() === "guest@example.com" &&
    (guestMessagesRemaining ?? user.guestMessagesRemaining) <= 0;

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };
  selectedChatRef.current = selectedChat;

  const fetchMessages = async () => {
    if (!selectedChat || !user) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      setLoading(true);

      const { data } = await axios.get(
        `/api/message/${selectedChat._id}`,
        config
      );
      setMessages(data);
      setLoading(false);

      if (socketRef.current?.connected) {
        socketRef.current.emit("join chat", selectedChat._id, (joined) => {
          if (joined) socketRef.current?.emit("messages read", selectedChat._id);
        });
      }
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load the Messages",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  const sendMessage = async (event) => {
    if (event.key === "Enter" && newMessage) {
      if (guestLimitReached) return;
      clearTimeout(typingTimeoutRef.current);
      setTyping(false);
      socketRef.current?.emit("stop typing", selectedChat._id);
      try {
        const config = {
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        };
        const { data } = await axios.post(
          "/api/message",
          {
            content: newMessage,
            chatId: selectedChat._id,
          },
          config
        );
        setNewMessage("");
        socketRef.current?.emit("new message", data);
        setMessages((currentMessages) => [...currentMessages, data]);
        if (typeof data.guestMessagesRemaining === "number") {
          setGuestMessagesRemaining(data.guestMessagesRemaining);
        }
      } catch (error) {
        if (error.response?.status === 429) {
          setGuestMessagesRemaining(0);
        }
        toast({
          title: "Error Occured!",
          description:
            error.response?.data?.message || "Failed to send the Message",
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
      }
    }
  };

  useEffect(() => {
    if (!user) return undefined;

    const socket = io(ENDPOINT, { auth: { token: user.token } });
    socketRef.current = socket;
    socket.emit("setup");
    socket.on("connected", () => setSocketConnected(true));
    socket.on("connect_error", (error) => {
      console.error("Socket.IO connection failed:", error.message);
      setSocketConnected(false);
    });
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));
    socket.on("messages read", ({ chatId, userId }) => {
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.chat._id === chatId
            ? { ...message, readBy: [...(message.readBy || []), userId] }
            : message
        )
      );
      setFetchAgain((currentValue) => !currentValue);
    });
    socket.on("message recieved", (newMessageRecieved) => {
      const activeChat = selectedChatRef.current;
      if (!activeChat || activeChat._id !== newMessageRecieved.chat._id) {
        setNotification((currentNotifications) =>
          currentNotifications.some(
            (notificationItem) => notificationItem._id === newMessageRecieved._id
          )
            ? currentNotifications
            : [newMessageRecieved, ...currentNotifications]
        );
      } else {
        setMessages((currentMessages) => [...currentMessages, newMessageRecieved]);
        const chatId = newMessageRecieved.chat._id;
        axios
          .patch(
            `/api/message/${chatId}/read`,
            {},
            { headers: { Authorization: `Bearer ${user.token}` } }
          )
          .then(() => socket.emit("messages read", chatId))
          .catch(() => {
            toast({
              title: "Could not update read status",
              status: "error",
              duration: 3000,
              isClosable: true,
              position: "bottom",
            });
          });
      }
      setFetchAgain((currentValue) => !currentValue);
    });
    socket.on("message deleted", ({ chatId, messageId, deletedBy }) => {
      if (selectedChatRef.current?._id === chatId) {
        setMessages((currentMessages) =>
          currentMessages.filter((message) => message._id !== messageId)
        );
      }
      setNotification((currentNotifications) =>
        currentNotifications.filter((notification) => notification._id !== messageId)
      );
      if (deletedBy !== user._id) {
        setFetchAgain((currentValue) => !currentValue);
      }
    });

    return () => {
      clearTimeout(typingTimeoutRef.current);
      socket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, [user, setFetchAgain, setNotification, toast]);

  useEffect(() => {
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat, user, socketConnected]);

  const typingHandler = (e) => {
    setNewMessage(e.target.value);

    if (!socketConnected) return;

    if (!typing) {
      setTyping(true);
      socketRef.current?.emit("typing", selectedChat._id);
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("stop typing", selectedChat._id);
      setTyping(false);
    }, 3000);
  };

  const deleteMessage = async (message) => {
    if (!window.confirm("Delete this message for everyone?")) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      await axios.delete(`/api/message/${message._id}`, config);
      setMessages((currentMessages) =>
        currentMessages.filter((currentMessage) => currentMessage._id !== message._id)
      );
      setFetchAgain((currentValue) => !currentValue);
    } catch (error) {
      toast({
        title: "Could not delete message",
        description: error.response?.data?.message || "Please try again.",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  return (
    <>
      {selectedChat ? (
        <>
          <Text
            fontSize={{ base: "28px", md: "30px" }}
            color="#243342"
            pb={3}
            px={2}
            w="100%"
            fontFamily="Work sans"
            d="flex"
            justifyContent={{ base: "space-between" }}
            alignItems="center"
          >
            <IconButton
              d={{ base: "flex", md: "none" }}
              icon={<ArrowBackIcon />}
              onClick={() => setSelectedChat("")}
            />
            {messages &&
              (!selectedChat.isGroupChat ? (
                <>
                  {getSender(user, selectedChat.users)}
                  <ProfileModal
                    user={getSenderFull(user, selectedChat.users)}
                  />
                </>
              ) : (
                <>
                  {selectedChat.chatName.toUpperCase()}
                  <UpdateGroupChatModal
                    fetchMessages={fetchMessages}
                    fetchAgain={fetchAgain}
                    setFetchAgain={setFetchAgain}
                  />
                </>
              ))}
          </Text>
          <Box
            className="chat-conversation-surface"
            d="flex"
            flexDir="column"
            justifyContent="flex-end"
            p={3}
            bg="#f2f4f6"
            w="100%"
            h="100%"
            borderRadius="lg"
            overflowY="hidden"
          >
            {loading ? (
              <Spinner
                size="xl"
                w={20}
                h={20}
                alignSelf="center"
                margin="auto"
              />
            ) : (
              <div className="messages">
                <ScrollableChat
                  messages={messages}
                  onDeleteMessage={deleteMessage}
                />
              </div>
            )}

            <FormControl
              onKeyDown={sendMessage}
              id="first-name"
              isRequired
              mt={3}
            >
              {istyping ? (
                <div>
                  <Lottie
                    options={defaultOptions}
                    // height={50}
                    width={70}
                    style={{ marginBottom: 15, marginLeft: 0 }}
                  />
                </div>
              ) : (
                <></>
              )}
              <Input
                variant="filled"
                bg="#e7ebef"
                placeholder={
                  guestLimitReached
                    ? "Guest limit reached (3 messages)"
                    : "Write a message..."
                }
                value={newMessage}
                isDisabled={guestLimitReached}
                onChange={typingHandler}
              />
              {user?.email?.toLowerCase() === "guest@example.com" && (
                <Text fontSize="xs" color="#71808b" mt={1} textAlign="right">
                  {Math.max(
                    0,
                    guestMessagesRemaining ?? user.guestMessagesRemaining ?? 3
                  )} of 3 guest messages remaining
                </Text>
              )}
            </FormControl>
          </Box>
        </>
      ) : (
        <Box
          className="chat-empty-state"
          d="flex"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          w="100%"
          h="100%"
          minH="320px"
          p={{ base: 5, md: 10 }}
          bg="#f2f4f6"
          borderRadius="6px"
        >
          <Box maxW="440px">
            <Box
              display="grid"
              placeItems="center"
              w="64px"
              h="64px"
              mx="auto"
              mb={5}
              bg="#e2e8ee"
              color="#34495d"
              borderRadius="16px"
            >
              <ChatIcon boxSize={7} />
            </Box>
            <Text
              fontSize="xs"
              fontWeight="bold"
              letterSpacing="0.1em"
              color="#788591"
            >
              YOUR MESSAGES
            </Text>
            <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight="semibold" color="#263645" mt={2}>
              Nothing open right now.
            </Text>
            <Text color="#6c7a86" mt={3}>
              {chats?.length
                ? `Choose one of your ${chats.length} conversations, or search for someone new.`
                : "Choose a person to message, or create a group conversation."}
            </Text>
            <Button
              mt={6}
              leftIcon={<SearchIcon />}
              bg="#a75f40"
              color="#ffffff"
              _hover={{ bg: "#8f4e34" }}
              onClick={onOpenSearch}
            >
              Search people
            </Button>
          </Box>
        </Box>
      )}
    </>
  );
};

export default SingleChat;
