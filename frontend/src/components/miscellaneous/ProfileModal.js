import { EditIcon, ViewIcon } from "@chakra-ui/icons";
import {
  Avatar,
  Box,
  Button,
  FormControl,
  FormLabel,
  IconButton,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Text,
  Textarea,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { ChatState } from "../../Context/ChatProvider.js";

const ProfileModal = ({ user, children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { user: currentUser, setUser } = ChatState();
  const isOwnProfile = currentUser?._id === user?._id;
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [picture, setPicture] = useState(user?.pic || "");
  const [about, setAbout] = useState(user?.about || "");
  const fileInputRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    setPicture(user?.pic || "");
    setAbout(user?.about || "");
    setIsEditing(false);
  }, [user]);

  const openProfile = () => {
    setPicture(user?.pic || "");
    setAbout(user?.about || "");
    setIsEditing(false);
    onOpen();
  };

  const closeProfile = () => {
    setIsEditing(false);
    setPicture(user?.pic || "");
    setAbout(user?.about || "");
    onClose();
  };

  const uploadPicture = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Choose a JPG, PNG, or WebP image", status: "warning" });
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: "Image must be smaller than 4 MB", status: "warning" });
      return;
    }

    setIsUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("upload_preset", "chat-app");
      uploadData.append("cloud_name", "piyushproj");

      const response = await fetch(
        "https://api.cloudinary.com/v1_1/piyushproj/image/upload",
        { method: "post", body: uploadData }
      );
      const result = await response.json();
      if (!response.ok || !result.secure_url) {
        throw new Error("Image upload failed. Try another image.");
      }
      setPicture(result.secure_url);
    } catch (error) {
      toast({
        title: error.message || "Could not upload the image",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const saveProfile = async () => {
    if (!picture) {
      toast({ title: "Add a profile picture first", status: "warning" });
      return;
    }

    setIsSaving(true);
    try {
      const { data } = await axios.put(
        "/api/user/profile",
        { pic: picture, about: about.trim() },
        { headers: { Authorization: `Bearer ${currentUser.token}` } }
      );
      const updatedUser = { ...currentUser, ...data };
      setUser(updatedUser);
      localStorage.setItem("userInfo", JSON.stringify(updatedUser));
      setIsEditing(false);
      toast({
        title: "Profile updated",
        status: "success",
        duration: 2500,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: error.response?.data?.message || "Could not update your profile",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {children ? (
        <span onClick={openProfile}>{children}</span>
      ) : (
        <IconButton
          aria-label="View profile"
          d={{ base: "flex" }}
          icon={<ViewIcon />}
          onClick={openProfile}
        />
      )}
      <Modal size="md" onClose={closeProfile} isOpen={isOpen} isCentered>
        <ModalOverlay />
        <ModalContent
          bg="#f7f8f9"
          color="#243342"
          borderRadius="12px"
          overflow="hidden"
        >
          <ModalHeader
            bg="#202d3b"
            color="#f8f7f4"
            borderBottom="3px solid #b66d4c"
            px={6}
            py={5}
          >
            <Text fontSize="xs" textTransform="uppercase" opacity={0.7}>
              {isOwnProfile ? "Your profile" : "Chat profile"}
            </Text>
            <Text fontSize="2xl" mt={1}>
              {user.name}
            </Text>
          </ModalHeader>
          <ModalCloseButton
            color="#f8f7f4"
            _hover={{ bg: "whiteAlpha.200" }}
          />
          <ModalBody px={6} py={6} bg="#f7f8f9" color="#243342">
            <Box display="flex" alignItems="center" gap={5} mb={6}>
              <Avatar
                size="2xl"
                name={user.name}
                src={isEditing ? picture : user.pic}
                border="4px solid"
                borderColor="#e4e9ed"
              />
              {isEditing && isOwnProfile && (
                <Box>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    display="none"
                    onChange={uploadPicture}
                  />
                  <Button
                    leftIcon={<EditIcon />}
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    isLoading={isUploading}
                    loadingText="Uploading"
                  >
                    Change photo
                  </Button>
                  <Text fontSize="xs" color="gray.500" mt={2}>
                    JPG, PNG, or WebP · up to 4 MB
                  </Text>
                </Box>
              )}
            </Box>

            <Text fontSize="xs" fontWeight="bold" color="#6c7a87" mb={1}>
              EMAIL
            </Text>
            <Text mb={6}>{user.email}</Text>

            {isEditing && isOwnProfile ? (
              <FormControl>
                <FormLabel fontSize="xs" fontWeight="bold" color="#6c7a87">
                  ABOUT
                </FormLabel>
                <Textarea
                  value={about}
                  onChange={(event) => setAbout(event.target.value)}
                  maxLength={180}
                  rows={4}
                  resize="vertical"
                  placeholder="A little about you..."
                />
                <Text textAlign="right" fontSize="xs" color="gray.500" mt={1}>
                  {about.length}/180
                </Text>
              </FormControl>
            ) : (
              <Box>
                <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={2}>
                  ABOUT
                </Text>
                <Text whiteSpace="pre-wrap" color={user.about ? "#344452" : "#74818c"}>
                  {user.about || "No about added yet."}
                </Text>
              </Box>
            )}
          </ModalBody>
          <ModalFooter px={6} pb={6} gap={2}>
            {isOwnProfile && !isEditing && (
              <Button leftIcon={<EditIcon />} onClick={() => setIsEditing(true)}>
                Edit profile
              </Button>
            )}
            {isOwnProfile && isEditing && (
              <>
                <Button variant="ghost" onClick={closeProfile}>
                  Cancel
                </Button>
                <Button
                  bg="#a75f40"
                  color="#ffffff"
                  _hover={{ bg: "#8f4e34" }}
                  onClick={saveProfile}
                  isLoading={isSaving}
                  isDisabled={isUploading}
                >
                  Save changes
                </Button>
              </>
            )}
            {!isOwnProfile && <Button onClick={closeProfile}>Close</Button>}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ProfileModal;
