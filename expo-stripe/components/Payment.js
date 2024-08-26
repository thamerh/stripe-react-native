import { useStripe } from "@stripe/stripe-react-native";
import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";

const Payment = () => {
  const [name, setName] = useState("");
  const stripe = useStripe();

  // Define the price in USD
  const priceUSD = 25;

  const subscribe = async () => {
    try {
      // Sending request with name and price
      const response = await fetch("http://192.168.9.62:8080/pay", {
        method: "POST",
        body: JSON.stringify({ name, priceUSD }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (!response.ok) return console.log(data.message);

      const clientSecret = data.clientSecret;
      const initSheet = await stripe.initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        googlePay: true,
        merchantDisplayName: 'Merchant Name'
      });
      if (initSheet.error) return console.log(initSheet.error.message);

      const presentSheet = await stripe.presentPaymentSheet({
        clientSecret,
      });
      if (presentSheet.error) return console.log(presentSheet.error.message);

      Alert.alert("Payment complete, thank you!");
    } catch (err) {
      console.error(err);
      Alert.alert("Something went wrong, try again later!");
    }
  };

  return (
    <View>
      <TextInput
        value={name}
        onChangeText={(text) => setName(text)}
        placeholder="Name"
        style={{
          width: 300,
          fontSize: 20,
          padding: 10,
          borderWidth: 1,
        }}
      />
      <Button title={`Subscribe - $${priceUSD}`} onPress={subscribe} />
    </View>
  );
};

export default Payment;
