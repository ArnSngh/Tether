import { Button } from "@chakra-ui/button";
import { Input } from "@chakra-ui/input";
import { Box, Text } from "@chakra-ui/layout";
import {
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
} from "@chakra-ui/menu";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
} from "@chakra-ui/modal";
import { Tooltip } from "@chakra-ui/tooltip";
import { BellIcon, ChevronDownIcon, SearchIcon } from "@chakra-ui/icons";
import { Avatar } from "@chakra-ui/avatar";
import { useHistory } from "react-router-dom";
import { useRef, useState } from "react";
import axios from "axios";
import { useToast } from "@chakra-ui/toast";
import ChatLoading from "../ChatLoading.js";
import { Spinner } from "@chakra-ui/spinner";
import ProfileModal from "./ProfileModal.js";
import NotificationBadge from "react-notification-badge";
import { Effect } from "react-notification-badge";
import { getSender } from "../../config/ChatLogics.js";
import UserListItem from "../userAvatar/UserListItem.js";
import { ChatState } from "../../Context/ChatProvider.js";

function SideDrawer({ isSearchOpen, setIsSearchOpen }) {
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const searchRequestId = useRef(0);

  const {
    setSelectedChat,
    user,
    notification,
    setNotification,
    setChats,
  } = ChatState();

  const toast = useToast();
  const history = useHistory();
  const onOpen = () => setIsSearchOpen(true);
  const onClose = () => setIsSearchOpen(false);

  const logoutHandler = () => {
    localStorage.removeItem("userInfo");
    history.push("/");
  };

  const handleSearch = async () => {
    const query = search.trim();
    if (!query) {
      setSearchResult([]);
      setHasSearched(false);
      return;
    }

    const requestId = ++searchRequestId.current;
    setHasSearched(true);
    setSearchError(false);
    setLoading(true);

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.get(
        `/api/user?search=${encodeURIComponent(query)}`,
        config
      );
      if (requestId === searchRequestId.current) setSearchResult(data);
    } catch (error) {
      if (requestId === searchRequestId.current) setSearchError(true);
    } finally {
      if (requestId === searchRequestId.current) setLoading(false);
    }
  };

  const accessChat = async (userId) => {
    try {
      setLoadingChat(true);
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.post(`/api/chat`, { userId }, config);

      setChats((currentChats) =>
        currentChats?.some((chat) => chat._id === data._id)
          ? currentChats
          : [data, ...(currentChats || [])]
      );
      setSelectedChat(data);
      onClose();
    } catch (error) {
      toast({
        title: "Error fetching the chat",
        description: error.response?.data?.message || error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
    } finally {
      setLoadingChat(false);
    }
  };

  return (
    <>
      <Box
        d="flex"
        justifyContent="space-between"
        alignItems="center"
        bg="#202d3b"
        color="#f5f5ed"
        w="100%"
        minH={{ base: "58px", md: "66px" }}
        px={{ base: 3, md: 6 }}
        py={2}
        borderBottom="1px solid"
        borderColor="#354556"
      >
        <Tooltip label="Search Users to chat" hasArrow placement="bottom-end">
          <Button
            variant="ghost"
            color="inherit"
            _hover={{ bg: "#334354" }}
            onClick={onOpen}
          >
            <SearchIcon />
            <Text d={{ base: "none", md: "flex" }} px={4}>
              Search User
            </Text>
          </Button>
        </Tooltip>
        <Text fontSize="2xl" fontWeight="semibold" letterSpacing="0.02em">
          Talk-A-Tive
        </Text>
        <div>
          <Menu>
            <MenuButton p={1}>
              <NotificationBadge
                count={notification.length}
                effect={Effect.SCALE}
              />
              <BellIcon fontSize="2xl" m={1} color="#f5f5ed" />
            </MenuButton>
            <MenuList pl={2} bg="#f8f9fa" color="#263442" borderColor="#d9dfe4">
              {!notification.length && (
                <MenuItem isDisabled color="#64717c">
                  No new messages
                </MenuItem>
              )}
              {notification.map((notif) => (
                <MenuItem
                  key={notif._id}
                  color="#263442"
                  _hover={{ bg: "#e9edf1" }}
                  onClick={() => {
                    setSelectedChat(notif.chat);
                    setChats((currentChats) =>
                      currentChats?.map((chat) =>
                        chat._id === notif.chat._id
                          ? { ...chat, unreadCount: 0 }
                          : chat
                      )
                    );
                    setNotification((currentNotifications) =>
                      currentNotifications.filter((item) => item._id !== notif._id)
                    );
                  }}
                >
                  {notif.chat.isGroupChat
                    ? `New Message in ${notif.chat.chatName}`
                    : `New Message from ${getSender(user, notif.chat.users)}`}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
          <Menu>
            <MenuButton
              as={Button}
              bg="transparent"
              color="#f5f5ed"
              _hover={{ bg: "#334354" }}
              _active={{ bg: "#334354" }}
              rightIcon={<ChevronDownIcon />}
            >
              <Avatar
                size="sm"
                cursor="pointer"
                name={user.name}
                src={user.pic}
              />
            </MenuButton>
            <MenuList bg="#f8f9fa" color="#263442" borderColor="#d9dfe4">
              <ProfileModal user={user}>
                <MenuItem color="#263442" _hover={{ bg: "#e9edf1" }}>
                  My Profile
                </MenuItem>
              </ProfileModal>
              <MenuDivider />
              <MenuItem
                color="#263442"
                _hover={{ bg: "#e9edf1" }}
                onClick={logoutHandler}
              >
                Logout
              </MenuItem>
            </MenuList>
          </Menu>
        </div>
      </Box>

      <Drawer placement="left" onClose={onClose} isOpen={isSearchOpen}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerHeader borderBottomWidth="1px">Search Users</DrawerHeader>
          <DrawerBody>
            <Box d="flex" pb={2}>
              <Input
                placeholder="Search by name or email"
                mr={2}
                value={search}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSearch();
                }}
                onChange={(event) => {
                  searchRequestId.current += 1;
                  setSearch(event.target.value);
                  setSearchResult([]);
                  setHasSearched(false);
                  setSearchError(false);
                  setLoading(false);
                }}
              />
              <Button
                onClick={handleSearch}
                isDisabled={!search.trim() || loading}
                isLoading={loading}
                aria-label="Search users"
              >
                Go
              </Button>
            </Box>
            {loading ? (
              <ChatLoading />
            ) : searchError ? (
              <Box py={8} textAlign="center">
                <Text fontWeight="semibold">Search is unavailable</Text>
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Check your connection and try again.
                </Text>
                <Button size="sm" mt={4} onClick={handleSearch}>
                  Try again
                </Button>
              </Box>
            ) : hasSearched && searchResult.length === 0 ? (
              <Box py={10} textAlign="center">
                <Text fontSize="lg" fontWeight="semibold">
                  No user found
                </Text>
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Try another name or email address.
                </Text>
              </Box>
            ) : !hasSearched ? (
              <Box py={10} textAlign="center">
                <Text fontWeight="semibold">Find someone to chat with</Text>
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Search by name or email address.
                </Text>
              </Box>
            ) : (
              searchResult?.map((user) => (
                <UserListItem
                  key={user._id}
                  user={user}
                  handleFunction={() => accessChat(user._id)}
                />
              ))
            )}
            {loadingChat && <Spinner ml="auto" d="flex" />}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export default SideDrawer;
