"use client";

import { useState } from "react";
import classes from "./AboutPage.module.css";
import {
  Button,
  Container,
  Modal,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";

type ContactField = "name" | "email" | "message";
export default function About() {
  const [contactUsModalOpen, setContactUsModalOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const handleContactUsClick = () => {
    setContactUsModalOpen(true);
  };
  const handleModalClose = () => {
    setContactUsModalOpen(false);
  };
  const handleInputChange = (key: ContactField, value: string) => {
    setEmailForm((current) => ({
      ...current,
      [key]: value,
    }));
  };
  const handleSendEmail = () => {
    const body = `From ${emailForm.name}: ${emailForm.email}\n${emailForm.message}`;
    window.open(
      `mailto:artmerrimack@gmail.com?subject=ContactForm&body=${encodeURIComponent(body)}`,
    );
    handleModalClose();
  };

  return (
    <div
      className={classes.aboutContainer}
      suppressHydrationWarning
    >
      <div className={classes.aboutContent}>
        <Container className={classes.introContainer}>
          <p>
            Art is an expression of human creativity, knowledge, and skill. It
            is usually produced to communicate a message. Most importantly, it
            is essential to understanding culture and society during a period of
            time. By looking and studying different art forms, we are able to
            learn more about ourselves and others. Additionally, art expands our
            imagination beyond the creative limits we set for ourselves.
            Merrimack College has developed a modest collection of artworks from
            gifts by exhibiting professional artists (McQuade Library Gallery,
            1970-1999 and the McCoy Gallery, 1999-2019). Additionally, the
            Merrimack College Art Collection includes a second group of artworks
            by Merrimack students. The Student Collection has been expanding
            through the generosity of our students. Please view our works on the
            “Collection” page, where a random selection of works will be shown
            via thumbnails. You can click on a small image to view a larger
            image, along with more details about the artwork.
          </p>
        </Container>
        <Container className={classes.contactBar}>
          <Button onClick={handleContactUsClick}>Contact Us</Button>
        </Container>
      </div>

      <Modal opened={contactUsModalOpen} onClose={handleModalClose} centered>
        <Container p="xl">
          <div className={classes.modalHeading}>
            <Text size="xl" mb={40}>
              Contact Us
            </Text>
          </div>
          <TextInput
            placeholder="Enter your name"
            value={emailForm.name}
            onChange={(event) =>
              handleInputChange("name", event.currentTarget.value)
            }
            mb={10}
          />
          <TextInput
            placeholder="Enter your email"
            value={emailForm.email}
            onChange={(event) =>
              handleInputChange("email", event.currentTarget.value)
            }
            mb={10}
          />
          <Textarea
            placeholder="Type your message here"
            value={emailForm.message}
            onChange={(event) =>
              handleInputChange("message", event.currentTarget.value)
            }
            mb={10}
          />
          <Button
            onClick={handleSendEmail}
            fullWidth
          >
            Send Email
          </Button>
        </Container>
      </Modal>
    </div>
  );
}
