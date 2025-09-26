import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Box, 
  Upload, 
  Zap, 
  Shield, 
  Globe, 
  Camera, 
  Search,
  User,
  Printer,
  CheckCircle,
  TrendingUp,
  BarChart3,
  Star
} from "lucide-react";
import { Link } from "wouter";
import { STLViewer } from "@/components/STLViewer";
import newImage from "@assets/IMG_2996_1758920535706.jpeg";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Box className="text-primary-foreground text-lg" />
              </div>
              <div className="text-xl font-bold text-white">Proof of Hardware</div>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#how-it-works" className="text-gray-200 hover:text-white transition-colors">How it Works</a>
              <a href="#features" className="text-gray-200 hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="text-gray-200 hover:text-white transition-colors">Pricing</a>
              <Button asChild variant="secondary">
                <a href="/api/login" data-testid="button-signin">Sign In</a>
              </Button>
            </div>
            
            <button className="md:hidden" data-testid="button-menu">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-secondary to-accent text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Builders, meet the
                <span className="text-primary"> 3D Printing Machine Economy</span>
              </h1>
              
              <p className="text-xl text-gray-200 mb-8 leading-relaxed">
                Upload your design for an Instant Quote, match with local 3D Printer Owners, and receive AI Quality-Assured parts delivered to your door.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25">
                  <a href="/api/login" data-testid="button-upload-print">
                    <Upload className="w-5 h-5 mr-2" />
                    Upload & Print
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                  <a href="/api/login" data-testid="button-become-printer">
                    <Printer className="w-5 h-5 mr-2" />
                    Become a Printer
                  </a>
                </Button>
              </div>
              
              <div className="flex items-center space-x-8 mt-12 text-sm text-gray-300">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span>AI Quality Control</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span>AI Competitive Pricing</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-accent" />
                  <span>Global Network</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <Card className="bg-white/10 border-white/20 backdrop-blur-sm animate-float">
                <CardContent className="p-16">
                  {/* Thinking Man Image */}
                  <div className="flex items-center justify-center">
                    <div className="relative overflow-hidden rounded-lg shadow-2xl">
                      <img 
                        src={newImage}
                        alt="3D Printed Sculpture"
                        className="w-80 h-auto object-contain"
                        data-testid="img-sculpture"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="absolute -bottom-4 -right-4 bg-primary text-primary-foreground rounded-xl p-4 shadow-lg">
                <div className="flex items-center space-x-2">
                  <Shield className="w-6 h-6" />
                  <div>
                    <div className="font-semibold">AI Quality</div>
                    <div className="text-sm opacity-90">Guaranteed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How Proof of Hardware Works</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              A seamless process from design to delivery, thanks to your local makers.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8" />
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary mb-4">Step 1</Badge>
              <h3 className="text-xl font-semibold mb-3">Upload STL File</h3>
              <p className="text-muted-foreground">Upload your 3D model and specify material preferences. Our AI analyzes printability and estimates costs.</p>
            </div>
            
            <div className="text-center group">
              <div className="w-20 h-20 bg-accent/10 text-accent rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Search className="w-8 h-8" />
              </div>
              <Badge variant="secondary" className="bg-accent/10 text-accent mb-4">Step 2</Badge>
              <h3 className="text-xl font-semibold mb-3">Smart Matching</h3>
              <p className="text-muted-foreground">AI matches you with the best local printer based on location, materials, quality rating, and price.</p>
            </div>
            
            <div className="text-center group">
              <div className="w-20 h-20 bg-bitcoin/10 text-bitcoin rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-8 h-8" />
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary mb-4">Step 3</Badge>
              <h3 className="text-xl font-semibold mb-3">Secure Payment</h3>
              <p className="text-muted-foreground">AI-powered competitive pricing with secure escrow. Funds held until quality verification is complete.</p>
            </div>
            
            <div className="text-center group">
              <div className="w-20 h-20 bg-green-500/10 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Camera className="w-8 h-8" />
              </div>
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 mb-4">Step 4</Badge>
              <h3 className="text-xl font-semibold mb-3">AI Quality Check</h3>
              <p className="text-muted-foreground">Printer submits photos for AI quality verification. Payment releases automatically upon approval.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Powered by Cutting-Edge Technology</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Advanced AI, Bitcoin Lightning Network, and global logistics create the future of distributed manufacturing.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-bitcoin/10 text-bitcoin rounded-xl flex items-center justify-center mb-6">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-4">AI Competitive Pricing</h3>
                <p className="text-muted-foreground mb-4">Smart algorithms analyze market rates to ensure fair, competitive pricing for every job.</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Real-time market analysis</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Transparent cost breakdown</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Best value guarantee</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-accent/10 text-accent rounded-xl flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-4">AI Quality Control</h3>
                <p className="text-muted-foreground mb-4">Computer vision ensures every print meets quality standards before payment release.</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Automated defect detection</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Dimensional accuracy verification</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Surface finish assessment</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                  <Box className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-4">3D Model Viewer</h3>
                <p className="text-muted-foreground mb-4">Interactive STL viewer with print analysis and cost estimation.</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Real-time model preview</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Printability analysis</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Material optimization</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-green-500/10 text-green-600 rounded-xl flex items-center justify-center mb-6">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Global Network</h3>
                <p className="text-muted-foreground mb-4">Connect with 3D printer owners worldwide for local manufacturing.</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Location-based matching</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Verified printer profiles</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Rating & review system</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Secure Escrow</h3>
                <p className="text-muted-foreground mb-4">Smart contracts protect both buyers and sellers throughout the process.</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Automated release conditions</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Dispute resolution</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Zero counterparty risk</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-purple-500/10 text-purple-600 rounded-xl flex items-center justify-center mb-6">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Real-time Tracking</h3>
                <p className="text-muted-foreground mb-4">Monitor your print job from start to finish with live updates.</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Print progress updates</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Photo documentation</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Delivery notifications</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Dual CTA Section */}
      <section className="py-20 bg-gradient-to-br from-secondary to-accent text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-primary/20 text-primary rounded-xl flex items-center justify-center mb-6">
                  <User className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Need Something Printed?</h3>
                <p className="text-gray-200 mb-6">
                  Upload your STL file and get connected with verified 3D printer owners in your area. Get instant quotes with AI-powered competitive pricing.
                </p>
                
                <div className="space-y-3 mb-8">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span>Upload any STL file format</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span>AI matches you with best local printer</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span>Quality guaranteed or money back</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span>AI-powered instant quotes</span>
                  </div>
                </div>
                
                <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25">
                  <a href="/api/login" data-testid="button-start-printing">
                    <Upload className="w-5 h-5 mr-2" />
                    Start Printing Now
                  </a>
                </Button>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-accent/20 text-accent rounded-xl flex items-center justify-center mb-6">
                  <Printer className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Own a 3D Printer?</h3>
                <p className="text-gray-200 mb-6">
                  Monetize your 3D printer by joining our global machine economy. Set your rates, choose your jobs, and earn from every quality print.
                </p>
                
                <div className="space-y-3 mb-8">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span>Set your own pricing and materials</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span>Accept or decline any job</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span>Instant payments upon AI quality approval</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span>Build reputation with ratings</span>
                  </div>
                </div>
                
                <Button asChild className="w-full bg-accent text-white hover:bg-accent/90">
                  <a href="/api/login" data-testid="button-register-printer">
                    <Printer className="w-5 h-5 mr-2" />
                    Register Your Printer
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2" data-testid="stat-printers">—</div>
              <div className="text-muted-foreground">Active Printers</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent mb-2" data-testid="stat-jobs">—</div>
              <div className="text-muted-foreground">Jobs Completed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-bitcoin mb-2" data-testid="stat-countries">—</div>
              <div className="text-muted-foreground">Countries Served</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2" data-testid="stat-rating">—</div>
              <div className="text-muted-foreground">Average Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary text-secondary-foreground py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <Box className="text-primary-foreground text-lg" />
                </div>
                <div className="text-xl font-bold">Proof of Hardware</div>
              </div>
              <p className="text-gray-300 mb-6">
                The world's first Lightning-powered distributed 3D printing marketplace. Connecting creators with makers globally.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Docs</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Community</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">Discord</a></li>
                <li><a href="#" className="hover:text-white transition-colors">GitHub</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Newsletter</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Proof of Hardware. Built on Bitcoin Lightning Network.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
