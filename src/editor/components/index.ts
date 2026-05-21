import Text from './Text';
import Button from './Button';
import Input from './Input';
import Image from './Image';
import Card from './card';

export const componentMap: Record<string, React.FC<any>> = {
  Text,
  Button,
  Input,
  Image,
  Card,
};

export { Text, Button, Input, Image, Card };
