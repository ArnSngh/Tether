import { Avatar } from "@chakra-ui/avatar";
import { Tooltip } from "@chakra-ui/tooltip";
import { DeleteIcon } from "@chakra-ui/icons";
import { IconButton } from "@chakra-ui/react";
import ScrollableFeed from "react-scrollable-feed";
import {
  isLastMessage,
  isSameSender,
  isSameSenderMargin,
  isSameUser,
} from "../config/ChatLogics.js";
import { ChatState } from "../Context/ChatProvider.js";

const ScrollableChat = ({ messages, onDeleteMessage }) => {
  const { user } = ChatState();

  return (
    <ScrollableFeed>
      {messages &&
        messages.map((m, i) => (
          <div className="chat-message-row" style={{ display: "flex" }} key={m._id}>
            {(isSameSender(messages, m, i, user._id) ||
              isLastMessage(messages, i, user._id)) && (
              <Tooltip label={m.sender.name} placement="bottom-start" hasArrow>
                <Avatar
                  mt="7px"
                  mr={1}
                  size="sm"
                  cursor="pointer"
                  name={m.sender.name}
                  src={m.sender.pic}
                />
              </Tooltip>
            )}
            <span
              style={{
                backgroundColor: `${
                  m.sender._id === user._id ? "#e3eaf0" : "#f0e9e2"
                }`,
                color: "#263442",
                marginLeft: isSameSenderMargin(messages, m, i, user._id),
                marginTop: isSameUser(messages, m, i, user._id) ? 3 : 10,
                borderRadius: "20px",
                padding: "5px 15px",
                maxWidth: "75%",
              }}
            >
              {m.content}
              {m.sender._id === user._id &&
                m.readBy?.some((reader) => (reader._id || reader) !== user._id) && (
                  <small
                    style={{
                      display: "block",
                      textAlign: "right",
                      marginTop: 2,
                      opacity: 0.7,
                    }}
                  >
                    Seen
                  </small>
                )}
            </span>
            {m.sender._id === user._id && (
              <Tooltip label="Delete for everyone" placement="top">
                <IconButton
                  className="delete-message-button"
                  icon={<DeleteIcon />}
                  aria-label="Delete message for everyone"
                  title="Delete for everyone"
                  size="xs"
                  variant="ghost"
                  color="#71808b"
                  _hover={{ color: "#a33d3d", bg: "#f3e5e5" }}
                  onClick={() => onDeleteMessage(m)}
                />
              </Tooltip>
            )}
          </div>
        ))}
    </ScrollableFeed>
  );
};

export default ScrollableChat;
