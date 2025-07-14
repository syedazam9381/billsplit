import { useState } from "react";
import { Camera, Users, Receipt, Calculator, Plus, X, Check, Loader } from "lucide-react";
import Tesseract from "tesseract.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface Friend {
  id: string;
  name: string;
  color: string;
}

interface BillItem {
  id: string;
  name: string;
  price: number;
  sharedWith: string[];
}

const defaultColors = [
  "bg-red-100 text-red-800",
  "bg-blue-100 text-blue-800", 
  "bg-green-100 text-green-800",
  "bg-yellow-100 text-yellow-800",
  "bg-purple-100 text-purple-800",
  "bg-pink-100 text-pink-800"
];

export default function BillSplitter() {
  const [step, setStep] = useState<'photo' | 'items' | 'friends' | 'split' | 'results'>('photo');
  const [billImage, setBillImage] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [items, setItems] = useState<BillItem[]>([]);
  const [newFriendName, setNewFriendName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const { toast } = useToast();

  const processOCR = async (imageUrl: string) => {
    setIsProcessingOCR(true);
    try {
      // Use Tesseract.js for OCR
      const result = await Tesseract.recognize(imageUrl, 'eng');
      const extractedText = result.data.text || '';

      // Parse extracted text for items and prices
      const extractedItems = parseReceiptText(extractedText);

      if (extractedItems.length > 0) {
        setItems(extractedItems);
        toast({
          title: "Items extracted successfully!",
          description: `Found ${extractedItems.length} items from your bill.`,
        });
      } else {
        toast({
          title: "No items found",
          description: "Unable to extract items automatically. You can add them manually.",
        });
      }
    } catch (error) {
      console.error('OCR processing failed:', error);
      toast({
        title: "OCR processing failed",
        description: "Please add items manually.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const parseReceiptText = (text: string): BillItem[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const items: BillItem[] = [];
    
    // Pattern to match item lines with prices (various formats)
    const itemPatterns = [
      /(.+?)\s+\$?(\d+\.?\d*)/,  // Item name followed by price
      /(.+?)\s+(\d+\.?\d*)\s*\$?/,  // Item name followed by price with optional $
      /(.+?)\$(\d+\.?\d*)/,  // Item name with $ before price
    ];
    
    for (const line of lines) {
      for (const pattern of itemPatterns) {
        const match = line.match(pattern);
        if (match) {
          const name = match[1].trim();
          const price = parseFloat(match[2]);
          
          // Filter out non-item lines (totals, taxes, etc.)
          if (name && price > 0 && 
              !name.toLowerCase().includes('total') &&
              !name.toLowerCase().includes('tax') &&
              !name.toLowerCase().includes('subtotal') &&
              !name.toLowerCase().includes('tip') &&
              name.length > 2) {
            
            items.push({
              id: `ocr-${Date.now()}-${items.length}`,
              name: name,
              price: price,
              sharedWith: []
            });
            break; // Found a match, move to next line
          }
        }
      }
    }
    
    return items;
  };

  const handleImageCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageUrl = e.target?.result as string;
        setBillImage(imageUrl);
        setStep('items');
        
        toast({
          title: "Photo captured!",
          description: "Processing image to extract items...",
        });
        
        // Process OCR automatically
        await processOCR(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const addFriend = () => {
    if (newFriendName.trim()) {
      const newFriend: Friend = {
        id: Date.now().toString(),
        name: newFriendName.trim(),
        color: defaultColors[friends.length % defaultColors.length]
      };
      setFriends([...friends, newFriend]);
      setNewFriendName("");
    }
  };

  const removeFriend = (id: string) => {
    setFriends(friends.filter(f => f.id !== id));
    setItems(items.map(item => ({
      ...item,
      sharedWith: item.sharedWith.filter(friendId => friendId !== id)
    })));
  };

  const addItem = () => {
    if (newItemName.trim() && newItemPrice.trim()) {
      const newItem: BillItem = {
        id: Date.now().toString(),
        name: newItemName.trim(),
        price: parseFloat(newItemPrice),
        sharedWith: []
      };
      setItems([...items, newItem]);
      setNewItemName("");
      setNewItemPrice("");
    }
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const toggleFriendForItem = (itemId: string, friendId: string) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const isAlreadyShared = item.sharedWith.includes(friendId);
        return {
          ...item,
          sharedWith: isAlreadyShared 
            ? item.sharedWith.filter(id => id !== friendId)
            : [...item.sharedWith, friendId]
        };
      }
      return item;
    }));
  };

  const calculateSplit = () => {
    const totals: Record<string, number> = {};
    friends.forEach(friend => {
      totals[friend.id] = 0;
    });

    items.forEach(item => {
      if (item.sharedWith.length > 0) {
        const splitAmount = item.price / item.sharedWith.length;
        item.sharedWith.forEach(friendId => {
          totals[friendId] += splitAmount;
        });
      }
    });

    return totals;
  };

  const getTotalBill = () => {
    return items.reduce((sum, item) => sum + item.price, 0);
  };

  const renderPhotoStep = () => (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Receipt className="w-6 h-6 text-primary" />
          Split Your Bill
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto bg-muted rounded-full flex items-center justify-center">
            <Camera className="w-12 h-12 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            Take a photo of your bill to get started
          </p>
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="bill-photo" className="sr-only">Upload bill photo</Label>
          <Input
            id="bill-photo"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageCapture}
            className="hidden"
          />
          <Button 
            variant="gradient"
            size="lg"
            className="w-full"
            onClick={() => document.getElementById('bill-photo')?.click()}
          >
            <Camera className="w-5 h-5" />
            Take Photo
          </Button>
          
          <Button 
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => setStep('items')}
          >
            Skip Photo
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderItemsStep = () => (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2">
          <Receipt className="w-6 h-6 text-primary" />
          Add Bill Items
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {billImage && (
          <div className="w-full max-w-sm mx-auto">
            <img 
              src={billImage} 
              alt="Bill" 
              className="w-full h-auto rounded-lg border shadow-sm"
            />
          </div>
        )}
        
        {isProcessingOCR && (
          <div className="flex items-center justify-center gap-2 p-4 bg-muted/50 rounded-lg">
            <Loader className="w-4 h-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              Extracting items from your bill...
            </span>
          </div>
        )}
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="item-name">Item Name</Label>
              <Input
                id="item-name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g., Caesar Salad"
              />
            </div>
            <div>
              <Label htmlFor="item-price">Price ($)</Label>
              <Input
                id="item-price"
                type="number"
                step="0.01"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                placeholder="12.99"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={addItem} className="flex-1">
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
            {billImage && (
              <Button 
                variant="outline" 
                onClick={() => processOCR(billImage)}
                disabled={isProcessingOCR}
                className="flex-1"
              >
                {isProcessingOCR ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Receipt className="w-4 h-4" />
                )}
                Re-scan Bill
              </Button>
            )}
          </div>
        </div>

        {items.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Bill Items</h3>
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">${item.price.toFixed(2)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(item.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <div className="pt-2 border-t">
              <p className="font-semibold text-right">Total: ${getTotalBill().toFixed(2)}</p>
            </div>
          </div>
        )}

        {items.length > 0 && (
          <Button 
            variant="success"
            className="w-full"
            onClick={() => setStep('friends')}
          >
            Continue to Add Friends
          </Button>
        )}
      </CardContent>
    </Card>
  );

  const renderFriendsStep = () => (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Add Friends
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="friend-name">Friend's Name</Label>
            <div className="flex gap-2">
              <Input
                id="friend-name"
                value={newFriendName}
                onChange={(e) => setNewFriendName(e.target.value)}
                placeholder="Enter friend's name"
                onKeyPress={(e) => e.key === 'Enter' && addFriend()}
              />
              <Button onClick={addFriend}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {friends.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Friends ({friends.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {friends.map(friend => (
                <div key={friend.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <Badge className={friend.color}>
                    {friend.name}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFriend(friend.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {friends.length > 0 && (
          <Button 
            variant="success"
            className="w-full"
            onClick={() => setStep('split')}
          >
            Continue to Split Items
          </Button>
        )}
      </CardContent>
    </Card>
  );

  const renderSplitStep = () => (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2">
          <Calculator className="w-6 h-6 text-primary" />
          Assign Items to Friends
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {items.map(item => (
          <div key={item.id} className="space-y-3 p-4 border rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-sm text-muted-foreground">${item.price.toFixed(2)}</p>
              </div>
              {item.sharedWith.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  ${(item.price / item.sharedWith.length).toFixed(2)} per person
                </p>
              )}
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2">Who shared this item?</p>
              <div className="flex flex-wrap gap-2">
                {friends.map(friend => (
                  <Button
                    key={friend.id}
                    variant={item.sharedWith.includes(friend.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleFriendForItem(item.id, friend.id)}
                    className="relative"
                  >
                    {item.sharedWith.includes(friend.id) && (
                      <Check className="w-3 h-3 mr-1" />
                    )}
                    {friend.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ))}

        <Button 
          variant="gradient"
          size="lg"
          className="w-full"
          onClick={() => setStep('results')}
          disabled={items.some(item => item.sharedWith.length === 0)}
        >
          Calculate Split
        </Button>
      </CardContent>
    </Card>
  );

  const renderResultsStep = () => {
    const totals = calculateSplit();
    const totalBill = getTotalBill();
    
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <Calculator className="w-6 h-6 text-primary" />
            Bill Split Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center p-6 bg-gradient-to-r from-primary/5 to-primary-glow/5 rounded-lg border">
            <p className="text-2xl font-bold text-primary">
              Total Bill: ${totalBill.toFixed(2)}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">How much each person owes:</h3>
            {friends.map(friend => (
              <div key={friend.id} className="flex justify-between items-center p-4 bg-muted/30 rounded-lg">
                <Badge className={friend.color + " text-base py-2 px-4"}>
                  {friend.name}
                </Badge>
                <p className="text-xl font-bold text-primary">
                  ${totals[friend.id]?.toFixed(2) || '0.00'}
                </p>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="font-semibold">Item breakdown:</h3>
            {items.map(item => (
              <div key={item.id} className="space-y-2 p-3 bg-card border rounded-lg">
                <div className="flex justify-between">
                  <span className="font-medium">{item.name}</span>
                  <span className="font-medium">${item.price.toFixed(2)}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {item.sharedWith.map(friendId => {
                    const friend = friends.find(f => f.id === friendId);
                    return friend ? (
                      <Badge key={friendId} variant="outline" className="text-xs">
                        {friend.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline"
              className="flex-1"
              onClick={() => setStep('photo')}
            >
              Start New Bill
            </Button>
            <Button 
              variant="success"
              className="flex-1"
              onClick={() => {
                toast({
                  title: "Bill split complete!",
                  description: "Results have been calculated successfully.",
                });
              }}
            >
              Share Results
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Progress indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-2">
            {['photo', 'items', 'friends', 'split', 'results'].map((s, index) => (
              <div key={s} className="flex items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s ? 'bg-primary text-primary-foreground' :
                    ['photo', 'items', 'friends', 'split', 'results'].indexOf(step) > index ? 'bg-success text-success-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}
                >
                  {index + 1}
                </div>
                {index < 4 && <div className="w-8 h-0.5 bg-muted mx-1" />}
              </div>
            ))}
          </div>
        </div>

        {step === 'photo' && renderPhotoStep()}
        {step === 'items' && renderItemsStep()}
        {step === 'friends' && renderFriendsStep()}
        {step === 'split' && renderSplitStep()}
        {step === 'results' && renderResultsStep()}
      </div>
    </div>
  );
}